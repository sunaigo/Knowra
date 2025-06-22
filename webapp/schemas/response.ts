export interface BaseResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface ListResponse<T = any> {
  code: number;
  message: string;
  data: T[];
} 