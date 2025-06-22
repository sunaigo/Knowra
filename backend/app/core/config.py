import os
import yaml
from dotenv import load_dotenv

# 在读取任何配置之前，先加载 .env 文件
# 这会将 .env 文件中的变量设置到环境变量中
load_dotenv()

CONF_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'conf', 'config.yaml')

class Config:
    def __init__(self, config_path=CONF_PATH):
        with open(config_path, 'r') as f:
            self._cfg = yaml.safe_load(f)
        
        self.FERNET_KEY = os.getenv("FERNET_KEY")

    @property
    def sqlalchemy_url(self):
        return self._cfg['sqlalchemy']['url']

    @property
    def embedding(self):
        return self._cfg['embedding']

    @property
    def cors(self):
        return self._cfg['cors']

    @property
    def jwt(self):
        return self._cfg['jwt']

    @property
    def upload(self):
        return self._cfg['upload']

    @property
    def sql_log_enable(self):
        return self._cfg['sqlalchemy'].get('sql_log_enable', False)

    @property
    def embedding_parallel_size(self):
        if 'embedding' not in self._cfg or not self._cfg['embedding']:
            return 10
        else:
            return self._cfg['embedding'].get('parallel', 10)

config = Config() 