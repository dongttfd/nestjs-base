// Configuration
interface DatabaseConfig {
  host: string;
  port: number;
  db: string;
  username: string;
  password: string;
}

interface SwaggerAppConfig {
  title?: string;
  description?: string;
  version?: string;
  tag?: string;
  authUserName?: string;
  authPassword?: string;
}

interface AppConfig {
  apiHost: string;
  apiPort?: number;
  redisHost?: string;
  redisPort?: number;
  cache: boolean;
  bodyJsonSizeLimit: string;
  database: {
    driver: string;
    mongo?: DatabaseConfig;
    mysql?: DatabaseConfig;
  };

  swagger?: SwaggerAppConfig;
  mail?: {
    host: string;
    port: number;
    username: string;
    password: string;
    defaultMail: string;
  };
  jwt?: {
    secret: string;
    expiration: string;
    refreshSecret: string;
    refreshExpiration: string;
  };
}

interface BaseResponse<T> {
  statusCode: number;
  message: string | string[];
  data?: T;
  error?: string;
}

type Collection<T> = {
  data: T[];
};

type Pagination<T> = Collection<T> & {
  totalItems: number;
  offset: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number;
  nextPage: number;
};

type SortParams = {
  sortBy: string;
  sortDirection: string;
};

type SortOption = {
  field: string;
  sort: number;
};

type PaginationParams = {
  page: number;
  limit?: number;
};

type PaginationWithDateQueryParams = PaginationParams & {
  date?: Date,
  createdAt?: Date,
}

type PaginatedMeta = {
  total: number;
  page: number;
  itemPerPage: number;
  prevPage: number | null;
  nextPage: number | null;
  lastPage: number;
};

type PaginatedResult<T> = {
  data: T[];
  meta: PaginatedMeta
};

type PaginateFunction = <T, K>(
  model: any,
  args?: K,
  options?: PaginationParams,
) => Promise<PaginatedResult<T>>;

// JWT
type JwtException<T> = Error<T>;
type UnknownException<T> = Error<T>;
type JwtPayload = {
  id: string;
  deviceId: string;
};
type AuthToken = {
  accessToken: string;
  refreshToken: string;
};

// Permission
type PermissionMetadata = {
  key: string;
  name: string;
};

type PermissionModel = {
  group: PermissionMetadata;
  permissions: PermissionMetadata[];
};

type AmountGroupDate = {
  date: string;
  amount: number;
};

type AmountGroupMonth = {
  month: string;
  amount: number;
};
