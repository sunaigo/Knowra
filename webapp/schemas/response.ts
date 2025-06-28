import { z } from 'zod';

export const BaseResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.any(),
});

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