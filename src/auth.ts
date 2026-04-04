import * as core from '@actions/core'
import type { ActionInputs, AuthHeaders } from './types.js'

/**
 * Builds authentication headers based on the configured auth mode.
 * Token values are never logged.
 */
export async function buildAuthHeaders(
  inputs: ActionInputs
): Promise<AuthHeaders> {
  switch (inputs.authMode) {
    case 'none':
      return {}

    case 'bearer_token': {
      let token: string | undefined = inputs.token
      if (!token && inputs.tokenEnvVar) {
        token = process.env[inputs.tokenEnvVar]
      }
      if (!token) {
        throw new Error(
          'auth_mode is bearer_token but no token was provided. ' +
            'Set the `token` input or `token_env_var` pointing to an environment variable containing the token.'
        )
      }
      return { Authorization: `Bearer ${token}` }
    }

    case 'oauth2_client_credentials': {
      if (!inputs.oauthTokenUrl) {
        throw new Error(
          'auth_mode is oauth2_client_credentials but oauth_token_url is not set.'
        )
      }
      if (!inputs.oauthClientId || !inputs.oauthClientSecret) {
        throw new Error(
          'auth_mode is oauth2_client_credentials but oauth_client_id or oauth_client_secret is not set.'
        )
      }

      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: inputs.oauthClientId,
        client_secret: inputs.oauthClientSecret
      })
      if (inputs.oauthScope) params.set('scope', inputs.oauthScope)
      if (inputs.oauthAudience) params.set('audience', inputs.oauthAudience)
      if (inputs.oauthResource) params.set('resource', inputs.oauthResource)

      core.debug(`Requesting OAuth2 token from ${inputs.oauthTokenUrl}`)

      let response: Response
      try {
        response = await fetch(inputs.oauthTokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        })
      } catch (err) {
        throw new Error(
          `Failed to reach OAuth2 token endpoint ${inputs.oauthTokenUrl}: ${err instanceof Error ? err.message : String(err)}`
        )
      }

      if (!response.ok) {
        throw new Error(
          `OAuth2 token request failed with status ${response.status} ${response.statusText}`
        )
      }

      let json: unknown
      try {
        json = await response.json()
      } catch {
        throw new Error('OAuth2 token endpoint returned non-JSON response.')
      }

      const accessToken = (json as Record<string, unknown>)['access_token']
      if (typeof accessToken !== 'string' || !accessToken) {
        throw new Error(
          'OAuth2 token response did not contain a valid access_token field.'
        )
      }

      return { Authorization: `Bearer ${accessToken}` }
    }

    case 'custom_header': {
      if (!inputs.customAuthHeaderValue) {
        throw new Error(
          'auth_mode is custom_header but custom_auth_header_value is not set.'
        )
      }
      return { [inputs.customAuthHeaderName]: inputs.customAuthHeaderValue }
    }

    default: {
      const exhaustive: never = inputs.authMode
      throw new Error(`Unknown auth_mode: ${exhaustive}`)
    }
  }
}
