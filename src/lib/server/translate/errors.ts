export class InvalidTranslateInputError extends Error {
  constructor(message = "Provide nonempty input and valid, unambiguous question-bank selections.") {
    super(message);
  }
}
