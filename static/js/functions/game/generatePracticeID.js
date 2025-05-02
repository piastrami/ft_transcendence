export function generatePracticeID() {
    return Math.random().toString(36).substring(2, 10); // Get a random base-36 string and slice it to 8 characters
  }
  