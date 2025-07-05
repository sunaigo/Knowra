import { z } from 'zod';

export const BaseResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown(),
});

export interface BaseResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface ListResponse<T = unknown> {
  code: number;
  message: string;
  data: T[];
} 