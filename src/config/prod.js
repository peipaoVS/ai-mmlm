const PROD_CONFIG = {
  api: {
    MAIN: 'http://192.168.1.168:8000',
    AUTH: 'http://192.168.1.168:8017'
  },
  proxy: {
    system: 'http://192.168.1.168:8017',
    ai: 'http://192.168.1.168:8000'
  },
  providers: {
    OLLAMA_DOMAIN: 'http://127.0.0.1:11434'
  }
}

export default PROD_CONFIG
