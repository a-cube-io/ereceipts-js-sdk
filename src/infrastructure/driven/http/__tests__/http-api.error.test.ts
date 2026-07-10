import { createHttpApiError, extractApiErrorMessage, extractHttpResponse } from '../http-api.error';

describe('http-api.error', () => {
  describe('extractApiErrorMessage', () => {
    it('should prefer detail over title', () => {
      expect(
        extractApiErrorMessage({
          detail: 'Detail message',
          title: 'Title message',
        })
      ).toBe('Detail message');
    });

    it('should fall back to title', () => {
      expect(extractApiErrorMessage({ title: 'Title message' })).toBe('Title message');
    });
  });

  describe('createHttpApiError', () => {
    it('should expose the backend payload on response', () => {
      const error = createHttpApiError(400, { detail: 'Invalid payload' });

      expect(error.message).toBe('Invalid payload');
      expect(error.response).toEqual({
        status: 400,
        data: { detail: 'Invalid payload' },
      });
    });
  });

  describe('extractHttpResponse', () => {
    it('should extract response from HttpApiError', () => {
      const error = createHttpApiError(403, { detail: 'Forbidden' });

      expect(extractHttpResponse(error)).toEqual({
        status: 403,
        data: { detail: 'Forbidden' },
      });
    });
  });
});
