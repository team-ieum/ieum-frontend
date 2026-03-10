import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from '@/mocks/server';

// 모든 테스트 시작 전 MSW 서버를 켭니다.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// 각 테스트가 끝날 때마다 핸들러를 초기화합니다. (다른 테스트에 영향을 주지 않기 위함)
afterEach(() => server.resetHandlers());

// 모든 테스트가 끝나면 서버를 닫습니다.
afterAll(() => server.close());