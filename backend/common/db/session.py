from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from common.core.log import logger
import logging
from common.core.config import config

SQLALCHEMY_DATABASE_URL = config.sqlalchemy_url

class LoguruHandler(logging.Handler):
    def emit(self, record):
        logger.opt(depth=6, exception=record.exc_info).log(record.levelname, self.format(record))

# 只有开启sql_log_enable时才配置SQLAlchemy日志
if config.sql_log_enable:
    # logging.basicConfig(handlers=[LoguruHandler()], level=logging.INFO)
    logging.getLogger('sqlalchemy.engine').addHandler(LoguruHandler())
    logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, echo=config.sql_log_enable
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) 