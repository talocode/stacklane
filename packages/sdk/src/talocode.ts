import { TeraClient } from './tera'
import { RouterClient } from './router'
import { AgentBrowserClient } from './agent-browser'
import { ClipLoopClient } from './cliploop'
import { CodraClient } from './codra'
import {
  TradiaClientPlaceholder,
  SignalLaneClientPlaceholder,
  WorkLaneClientPlaceholder,
} from './placeholders'

export interface TalocodeOptions {
  apiKey?: string
  baseUrl?: string
  timeoutMs?: number
  headers?: Record<string, string>
}

const DEFAULT_BASE_URL = 'https://api.talocode.xyz'
const DEFAULT_TIMEOUT_MS = 30000

export class Talocode {
  public tera: TeraClient
  public router: RouterClient
  public agentBrowser: AgentBrowserClient
  public cliploop: ClipLoopClient
  public codra: CodraClient
  public tradia: TradiaClientPlaceholder
  public signallane: SignalLaneClientPlaceholder
  public worklane: WorkLaneClientPlaceholder
  public baseUrl: string
  public apiKey: string | undefined
  public timeoutMs: number

  constructor(options: TalocodeOptions = {}) {
    this.apiKey =
      options.apiKey ??
      (typeof process !== 'undefined' ? process.env.TALOCODE_API_KEY : undefined)
    this.baseUrl =
      options.baseUrl ??
      (typeof process !== 'undefined' ? process.env.TALOCODE_BASE_URL : undefined) ??
      DEFAULT_BASE_URL
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

    this.tera = new TeraClient(this.baseUrl, this.apiKey, this.timeoutMs)
    this.router = new RouterClient(this.baseUrl, this.apiKey, this.timeoutMs)
    this.agentBrowser = new AgentBrowserClient(this.baseUrl, this.apiKey, this.timeoutMs)
    this.cliploop = new ClipLoopClient(this.baseUrl, this.apiKey, this.timeoutMs)
    this.codra = new CodraClient(this.baseUrl, this.apiKey, this.timeoutMs)
    this.tradia = new TradiaClientPlaceholder()
    this.signallane = new SignalLaneClientPlaceholder()
    this.worklane = new WorkLaneClientPlaceholder()
  }
}
