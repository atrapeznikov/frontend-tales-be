import { validate } from 'class-validator';
import { IsSafeText } from './is-safe-text.decorator.js';

class TestDto {
  @IsSafeText()
  content: string;
}

describe('IsSafeText Decorator', () => {
  it('should pass on safe text content', async () => {
    const dto = new TestDto();
    dto.content = 'This is a normal comment. <3 I love this article!';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail on script tags', async () => {
    const dto = new TestDto();
    dto.content = 'Hello <script>alert("hack")</script> world';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isSafeText).toBeDefined();
  });

  it('should fail on image error tags (XSS)', async () => {
    const dto = new TestDto();
    dto.content = 'Hello <img src=x onerror=alert(1)>';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail on javascript links', async () => {
    const dto = new TestDto();
    dto.content = '[Click me](javascript:alert(1))';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail on SQL injection (tautology)', async () => {
    const dto = new TestDto();
    dto.content = "comment' OR '1'='1";
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail on SQL injection (union select)', async () => {
    const dto = new TestDto();
    dto.content = "comment' UNION SELECT username, password FROM users --";
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail on SQL injection (drop table)', async () => {
    const dto = new TestDto();
    dto.content = "comment'; DROP TABLE comments; --";
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
