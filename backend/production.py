"""
Production configuration for Know-Flow Backend
"""
import os
from typing import Dict, Any

# Production settings
PRODUCTION_CONFIG: Dict[str, Any] = {
    # Server settings
    "host": "0.0.0.0",
    "port": int(os.getenv("PORT", 8000)),
    "workers": int(os.getenv("WORKERS", 4)),
    "worker_class": "uvicorn.workers.UvicornWorker",
    
    # Logging
    "log_level": "info",
    "access_log": True,
    "error_log": True,
    
    # Security
    "forwarded_allow_ips": "*",
    "proxy_headers": True,
    "secure_scheme_headers": {
        "X-FORWARDED-PROTOCOL": "ssl",
        "X-FORWARDED-PROTO": "https",
        "X-FORWARDED-SSL": "on"
    },
    
    # Performance
    "max_requests": 1000,
    "max_requests_jitter": 100,
    "timeout": 120,
    "keepalive": 2,
    "worker_connections": 1000,
    
    # SSL (if using HTTPS)
    "keyfile": os.getenv("SSL_KEYFILE"),
    "certfile": os.getenv("SSL_CERTFILE"),
    
    # Monitoring
    "statsd_host": os.getenv("STATSD_HOST"),
    "statsd_prefix": "knowflow.backend",
    
    # Health check
    "health_check_interval": 30,
    "health_check_timeout": 10,
}

# Gunicorn specific settings
bind = f"{PRODUCTION_CONFIG['host']}:{PRODUCTION_CONFIG['port']}"
workers = PRODUCTION_CONFIG['workers']
worker_class = PRODUCTION_CONFIG['worker_class']
worker_connections = PRODUCTION_CONFIG['worker_connections']
max_requests = PRODUCTION_CONFIG['max_requests']
max_requests_jitter = PRODUCTION_CONFIG['max_requests_jitter']
timeout = PRODUCTION_CONFIG['timeout']
keepalive = PRODUCTION_CONFIG['keepalive']

# Logging
loglevel = PRODUCTION_CONFIG['log_level']
accesslog = "-" if PRODUCTION_CONFIG['access_log'] else None
errorlog = "-" if PRODUCTION_CONFIG['error_log'] else None

# Security
forwarded_allow_ips = PRODUCTION_CONFIG['forwarded_allow_ips']
proxy_headers = PRODUCTION_CONFIG['proxy_headers']
secure_scheme_headers = PRODUCTION_CONFIG['secure_scheme_headers']

# SSL (if configured)
if PRODUCTION_CONFIG['keyfile'] and PRODUCTION_CONFIG['certfile']:
    keyfile = PRODUCTION_CONFIG['keyfile']
    certfile = PRODUCTION_CONFIG['certfile']

# Monitoring
if PRODUCTION_CONFIG['statsd_host']:
    statsd_host = PRODUCTION_CONFIG['statsd_host']
    statsd_prefix = PRODUCTION_CONFIG['statsd_prefix']

# Preload app for better performance
preload_app = True

# Worker lifecycle hooks
def on_starting(server):
    """Called just after the master process is initialized."""
    server.log.info("Starting Know-Flow Backend...")

def on_reload(server):
    """Called to reload the master process."""
    server.log.info("Reloading Know-Flow Backend...")

def worker_int(worker):
    """Called when a worker receives SIGINT or SIGQUIT."""
    worker.log.info("Worker received SIGINT or SIGQUIT")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    server.log.info("Worker will be spawned")

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_worker_init(worker):
    """Called just after a worker has initialized the application."""
    worker.log.info("Worker initialized (pid: %s)", worker.pid)

def worker_abort(worker):
    """Called when a worker is being aborted."""
    worker.log.info("Worker aborted (pid: %s)", worker.pid)

def pre_exec(server):
    """Called just before the master process is exec'd."""
    server.log.info("Master process about to exec")

def when_ready(server):
    """Called just after the server is started."""
    server.log.info("Server is ready. Spawning workers")

def on_exit(server):
    """Called just before exiting."""
    server.log.info("Server is shutting down")

# Worker timeout and restart settings
graceful_timeout = 30
worker_tmp_dir = "/dev/shm"
worker_exit_on_app_failure = True

# Process naming
proc_name = "knowflow-backend"

# Server socket
backlog = 2048
reuse_port = True

# Worker processes
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 120
keepalive = 2

# Logging format
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'
