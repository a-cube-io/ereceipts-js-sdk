/**
 * Inquirer Mock for Testing
 * Provides a simplified version of inquirer that works in Jest ESM environment
 */

interface MockPrompt {
  type: string;
  name: string;
  message: string;
  default?: any;
  choices?: any[];
  validate?: (input: any) => boolean | string;
  when?: (answers: any) => boolean;
}

const mockInquirer = {
  async prompt(questions: MockPrompt | MockPrompt[]): Promise<any> {
    const questionArray = Array.isArray(questions) ? questions : [questions];
    const answers: any = {};
    
    // Return mock answers for testing
    for (const question of questionArray) {
      switch (question.type) {
        case 'input':
          answers[question.name] = question.default || 'test-input';
          break;
        case 'password':
          answers[question.name] = 'test-password';
          break;
        case 'confirm':
          answers[question.name] = true;
          break;
        case 'list':
        case 'rawlist':
          answers[question.name] = question.choices?.[0] || 'test-choice';
          break;
        case 'checkbox':
          answers[question.name] = question.choices?.slice(0, 1) || ['test-choice'];
          break;
        default:
          answers[question.name] = 'test-value';
      }
    }
    
    return answers;
  },
};

export default mockInquirer;