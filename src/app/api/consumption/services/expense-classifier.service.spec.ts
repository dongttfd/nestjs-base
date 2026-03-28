import { ExpenseClassifierService } from '@/app/api/consumption/services/expense-classifier.service';

describe('ExpenseClassifierService', () => {
  let service: ExpenseClassifierService;

  beforeEach(() => {
    service = new ExpenseClassifierService();
  });

  it('classifies titles deterministically regardless of accents and casing', () => {
    expect(service.classify('Bữa Trưa')).toBe('essential');
    expect(service.classify('bua trua')).toBe('essential');
    expect(service.classify('BỮA TRƯA')).toBe('essential');
  });

  it('ưu tiên rule cụ thể hơn và tie-break theo thứ tự đã chốt', () => {
    expect(service.classify('Tiền phòng và nước uống')).toBe('housing');
    expect(service.classify('Đổ xăng và mua bánh kẹo')).toBe('transport');
  });

  it('phân loại đúng các category canonical phổ biến theo pattern mới', () => {
    expect(service.classify('Thuốc + nước')).toBe('health');
    expect(service.classify('Mua màn hình')).toBe('shopping');
    expect(service.classify('Chơi game')).toBe('entertainment_social');
    expect(service.classify('Học phí tiếng Anh')).toBe('education');
    expect(service.classify('Thẻ điện thoại')).toBe('essential');
    expect(service.classify('Thuốc lá')).toBe('essential');
  });

  it('falls back to other for empty, unknown, or ambiguous titles', () => {
    expect(service.classify('')).toBe('other');
    expect(service.classify('   ')).toBe('other');
    expect(service.classify('Đưa cho vk')).toBe('other');
    expect(service.classify('Chi phí phát sinh')).toBe('other');
  });
});
