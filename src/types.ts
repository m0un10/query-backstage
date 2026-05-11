export type AuthMode =
  | 'none'
  | 'bearer_token'
  | 'oauth2_client_credentials'
  | 'custom_header'
export type OrderDirection = 'asc' | 'desc'
export type EntityRefFormat = 'compound' | 'triplet'
export type AuthHeaders = Record<string, string>
export type FilterSet = Record<string, string[]>

export interface ActionInputs {
  backstageBaseUrl: string
  catalogPath: string
  pageLimit: number
  maxEntities: number | undefined
  failOnEmpty: boolean
  includeRawResponse: boolean
  debugRequest: boolean
  kind: string[]
  namespace: string[]
  tags: string[]
  name: string[]
  owner: string[]
  system: string[]
  type: string[]
  lifecycle: string[]
  filter: string
  fields: string[]
  orderField: string | undefined
  orderDirection: OrderDirection | undefined
  fullText: string | undefined
  entityRefFormat: EntityRefFormat
  authMode: AuthMode
  token: string | undefined
  tokenEnvVar: string | undefined
  customAuthHeaderName: string
  customAuthHeaderValue: string | undefined
  oauthTokenUrl: string | undefined
  oauthClientId: string | undefined
  oauthClientSecret: string | undefined
  oauthScope: string | undefined
  oauthAudience: string | undefined
  oauthResource: string | undefined
  timeoutMs: number
}

export interface BackstageEntity {
  kind?: string
  metadata?: {
    name?: string
    namespace?: string
    tags?: string[]
    [key: string]: unknown
  }
  spec?: {
    owner?: string
    system?: string
    type?: string
    lifecycle?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface CatalogQueryResponse {
  items: BackstageEntity[]
  totalItems?: number
  pageInfo?: {
    nextCursor?: string
  }
}
