import { UseQueryOptions, QueryKey, UseInfiniteQueryOptions, InfiniteData } from '@tanstack/react-query'
import { AxiosError } from 'axios'

export type UseQueryCustomOptions<TData = unknown, TError = AxiosError, TQueryKey extends QueryKey = QueryKey> = Omit<
  UseQueryOptions<TData, TError, TData, TQueryKey>,
  'queryKey' | 'queryFn'
>

// 무한 스크롤 쿼리용 새로운 타입
export type UseInfiniteQueryCustomOptions<
  TQueryFnData = unknown,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = Omit<
  UseInfiniteQueryOptions<TQueryFnData, AxiosError, InfiniteData<TQueryFnData, TPageParam>, TQueryKey, TPageParam>,
  'queryKey' | 'queryFn'
>
