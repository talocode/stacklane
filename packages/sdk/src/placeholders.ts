import { TalocodeNotImplementedError } from './errors'

export class CodraClientPlaceholder {
  async execute(): Promise<never> {
    throw new TalocodeNotImplementedError('codra', 'execute')
  }
}

export class TradiaClientPlaceholder {
  async analyze(): Promise<never> {
    throw new TalocodeNotImplementedError('tradia', 'analyze')
  }
}

export class WorkLaneClientPlaceholder {
  async run(): Promise<never> {
    throw new TalocodeNotImplementedError('worklane', 'run')
  }
}
