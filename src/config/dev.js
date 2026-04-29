const SYSTEM_HOST = 'http://192.168.1.37'
const AI_HOST = 'http://192.168.1.168'

const DEV_CONFIG = {
  api: {
    MAIN: `${AI_HOST}:8000`,
    AUTH: `${SYSTEM_HOST}:8017`
  },
  proxy: {
    system: `${SYSTEM_HOST}:8017`,
    ai: `${AI_HOST}:8000`
  },
  providers: {
    OLLAMA_DOMAIN: 'http://127.0.0.1:11434'
  }
}

export default DEV_CONFIG
