import { ApiModule } from '@/app/api/api.module';
import start from './start';

export default async () => {
  await start(ApiModule);
};
