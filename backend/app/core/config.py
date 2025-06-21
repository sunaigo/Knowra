import os
import yaml

CONF_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'conf', 'config.yaml')

class Config:
    def __init__(self):
        with open(CONF_PATH, 'r', encoding='utf-8') as f:
            self._cfg = yaml.safe_load(f)

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
    def embedding_parallel(self):
        return self._cfg['embedding'].get('parallel', 10)

config = Config() 