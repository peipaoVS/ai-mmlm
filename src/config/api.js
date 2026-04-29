import devConfig from './dev'
import prodConfig from './prod'

const activeConfig = import.meta.env.DEV ? devConfig : prodConfig

export const API_CONFIG = activeConfig.api
export const PROXY_CONFIG = activeConfig.proxy
export const PROVIDER_CONFIG = activeConfig.providers
export const APP_ENV_CONFIG = activeConfig
