import { ExpenseOverviewCategoryKey } from '@/app/api/consumption/constants/expense-categories';

export interface ExpenseClassifierRule {
  key: ExpenseOverviewCategoryKey;
  score: number;
  examples: string[];
  patterns: RegExp[];
}

export const EXPENSE_CLASSIFIER_TIEBREAK_ORDER: ExpenseOverviewCategoryKey[] = [
  'housing',
  'transport',
  'health',
  'education',
  'essential',
  'shopping',
  'entertainment_social',
  'other',
];

export const EXPENSE_CLASSIFIER_TIEBREAK_PRIORITY =
  EXPENSE_CLASSIFIER_TIEBREAK_ORDER.reduce(
    (result, key, index) => {
      result[key] = index;

      return result;
    },
    {} as Record<ExpenseOverviewCategoryKey, number>,
  );

export const EXPENSE_CLASSIFIER_RULES: ExpenseClassifierRule[] = [
  {
    key: 'housing',
    score: 120,
    examples: ['tiền phòng', 'tiền điện tháng 3', 'internet'],
    patterns: [
      /\b(tien\s*phong|tien\s*nha|thue\s*nha|tien\s*tro)\b/,
      /\b(tien\s*(dien|nuoc)|hoa\s*don\s*(dien|nuoc)|wifi|internet|gas|doi\s*ga|truyen\s*hinh)\b/,
    ],
  },
  {
    key: 'transport',
    score: 110,
    examples: ['đổ xăng', 'vé xe khách', 'sửa xe'],
    patterns: [
      /\b(do\s*xang|xang\s*xe|tram\s*xang|xang)\b/,
      /\b(gui\s*xe|ve\s*xe\s*khach|ve\s*xe|taxi|grab|be|xe\s*om|xe\s*buyt|tien\s*xang\s*xe)\b/,
      /\b(sua\s*xe(\s*may)?|rua\s*xe|dan\s*xe|phi\s*cau\s*duong|ve\s*que|thay\s*dau\s*xe|bao\s*hiem\s*xe\s*may)\b/,
    ],
  },
  {
    key: 'health',
    score: 100,
    examples: ['thuốc + nước', 'khám bệnh định kỳ', 'bảo hiểm'],
    patterns: [
      /\b(kham\s*benh|chua\s*benh|vien\s*phi|benh\s*vien|nha\s*thuoc)\b/,
      /\b(thuoc\s*\+\s*nuoc|thuoc\s*nuoc|nuoc\s*\+\s*thuoc|bao\s*hiem|suc\s*khoe|y\s*te|test\s*(nhanh|covid)|kit\s*test|khau\s*trang)\b/,
      /\b(mua\s*thuoc|thuoc\s*(uong|dau\s*dau|cam\s*cum|nhiet(\s*mieng)?)|lam\s*rang|nho\s*rang)\b/,
    ],
  },
  {
    key: 'education',
    score: 90,
    examples: ['học phí tiếng Anh', 'khóa học'],
    patterns: [
      /\b(hoc\s*phi|hoc\s*tieng\s*anh|khoa\s*hoc|course|giao\s*trinh|hoc\s*tap)\b/,
    ],
  },
  {
    key: 'essential',
    score: 80,
    examples: ['ăn trưa', 'thuốc lá', 'thẻ điện thoại'],
    patterns: [
      /\b(an\s*(sang|trua|toi|vat|dem|nhau)|bua\s*(sang|trua|toi)|do\s*an|thuc\s*an|quan\s*an|an\s*uong)\b/,
      /\b(ca\s*phe|tra\s*sua|nuoc\s*ngot|nuoc\s*uong|mua\s*nuoc\s*uong|doi\s*nuoc)\b/,
      /\b(mua\s*thuc\s*an|mua\s*gao|mua\s*hoa\s*qua|hoa\s*qua|di\s*cho|banh\s*keo|gao\s*nuoc|big\s*c)\b/,
      /\b(thuoc\s*la|the\s*(dien\s*thoai|dt)|nap\s*(dien\s*thoai|the\s*dt)|tien\s*dien\s*thoai|giay\s*vs|dau\s*goi|giat\s*(do|chan)|cat\s*toc|kem\s*danh\s*rang)\b/,
      /\b(sinh\s*hoat|tieu\s*dung|tien\s*an|do\s*thiet\s*yeu|do\s*sinh\s*hoat|my\s*do\s*an|thuc\s*an\s*do\s*dung\s*sinh\s*hoat|nuoc\s*cam)\b/,
    ],
  },
  {
    key: 'shopping',
    score: 70,
    examples: ['mua màn hình', 'mua máy tính', 'quần áo'],
    patterns: [
      /\b(mua\s*(man\s*hinh|may\s*tinh|ghe|ban\s*phim|cong\s*chuyen\s*doi|cap\s*man\s*hinh))\b/,
      /\b(mua\s*(ao|quan\s*ao|dep|giay|op|dan\s*kinh\s*cuong\s*luc|goi|do\s*van\s*phong|do\s*ve\s*nha|do\s*cho\s*vk))\b/,
      /\b(quan\s*ao|thay\s*pin\s*dien\s*thoai|mua\s*tai\s*nghe|tai\s*phan\s*mem)\b/,
    ],
  },
  {
    key: 'entertainment_social',
    score: 60,
    examples: ['chơi game', 'mừng đám cưới', 'quà 8/3'],
    patterns: [
      /\b(choi\s*game|nap\s*game|xem\s*phim|karaoke|du\s*lich|ve\s*cap\s*treo|ve\s*xem\s*film|netflix|spotify)\b/,
      /\b(mung\s*(dam\s*cuoi|cuoi)|dam\s*cuoi|sinh\s*nhat|qua\s*(8\/3|sn|nam\s*moi)|qua\s*tang|li\s*xi|choi\s*xuan|lien\s*hoan)\b/,
      /\b(do\s*choi|hen\s*ho|tien\s*da\s*bong|dua\s*tre\s*con\s*di\s*choi)\b/,
    ],
  },
];
