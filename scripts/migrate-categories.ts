import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import 'dotenv/config';

const prisma = new PrismaClient();
const CLASSIFIER_SERVICE_URL = process.env.CLASSIFIER_SERVICE_URL || 'http://localhost:8000';

async function main() {
  const args = process.argv.slice(2);
  const isRefresh = args.includes('--refresh');

  console.log(`Starting expense data migration...`);
  console.log(`Connecting to Classifier Service at: ${CLASSIFIER_SERVICE_URL}`);
  
  if (isRefresh) {
    console.log('Mode: REFRESH ALL (Classifying all records)');
  } else {
    console.log('Mode: DEFAULT (Only classifying unclassified/other records)');
  }

  // 1. Find consumptions based on mode
  const whereClause = isRefresh
    ? undefined
    : {
        OR: [{ categoryKey: null }, { categoryKey: 'other' }],
      };

  const consumptions = await prisma.consumption.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
    },
  });

  const total = consumptions.length;
  console.log(`Found ${total} transactions requiring reclassification.`);

  if (total === 0) {
    console.log('No transactions to migrate. Exiting.');
    return;
  }

  // 2. Batch in groups of 50 records
  const BATCH_SIZE = 50;
  let successCount = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = consumptions.slice(i, i + BATCH_SIZE);
    const items = batch.map(c => ({ id: c.id, text: c.title }));

    console.log(`Classifying batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(total / BATCH_SIZE)} (size: ${batch.length})...`);

    try {
      // 3. Call batch classify API
      const response = await axios.post(`${CLASSIFIER_SERVICE_URL}/api/classify-batch`, { items }, { timeout: 30000 });
      const results = response.data?.results;

      if (!results || !Array.isArray(results)) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} returned an invalid response format.`);
        continue;
      }

      // 4. Update categoryKey in DB via transaction
      await prisma.$transaction(
        results.map(r =>
          prisma.consumption.update({
            where: { id: r.id },
            data: { categoryKey: r.category }
          })
        )
      );

      successCount += batch.length;
      console.log(`Successfully classified ${successCount}/${total} transactions.`);
    } catch (error: any) {
      console.error(`Error processing batch:`, error.message);
    }
  }

  // 5. Invalidate snapshots by deleting all legacy snapshots
  console.log('Deleting all legacy snapshots to regenerate with the new classifier...');
  await prisma.expenseOverviewSnapshot.deleteMany();
  console.log('Migration completed successfully!');
}

main()
  .catch(e => {
    console.error('Fatal error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
