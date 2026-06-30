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

export class SignalLaneClientPlaceholder {
  async detect(): Promise<never> {
    throw new TalocodeNotImplementedError('signallane', 'detect')
  }
}

export class WorkLaneClientPlaceholder {
  async run(): Promise<never> {
    throw new TalocodeNotImplementedError('worklane', 'run')
  }
}
