export const CONSTANTS = {
  ACTIVE: 1,
  DEFAULT_PAGINATE: 10,
  INACTIVE: 0,
};

export const SORT_ASC = 'asc';
export const SORT_DESC = 'desc';
export enum SortOptions {
  ASC = 1,
  DESC = -1,
}
export const BOOLEAN_PARAM = {
  TRUE: 1,
  FALSE: 0,
};

export const OTP_LENGTH = 6;
export const HOUR = 60 * 60 * 1000;

export enum LogType {
  INFO = 'INFO',
  ERROR = 'ERROR',
}

export const DEFAULT_LIMIT_PAGINATION = 10;
export const DEFAULT_PAGINATION_PARAMS: PaginationParams = {
  page: 1,
  limit: DEFAULT_LIMIT_PAGINATION,
};

export const VIETNAM_PHONE_NUMBER_REGEX = /^0(3|5|7|8|9)[0-9]{8}$/;
