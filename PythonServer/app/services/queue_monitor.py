import asyncio
import psutil
from datetime import datetime, timezone

class SystemMonitor:
    def __init__(self):
        self.absolute_max_workers = 20
        self.min_workers = 1
        self.current_allowed = self.absolute_max_workers
        self.history = []

    async def poll_loop(self):
        # Inicializa o CPU tracking
        psutil.cpu_percent(interval=None)
        while True:
            await asyncio.sleep(1.0)
            cpu_percent = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory()
            mem_percent = mem.percent

            max_load = max(cpu_percent, mem_percent)
            allowed = self.absolute_max_workers

            if max_load >= 50.0:
                safe_ratio = (100.0 - max_load) / 50.0
                allowed = int(self.absolute_max_workers * safe_ratio)

            self.current_allowed = max(self.min_workers, min(allowed, self.absolute_max_workers))
            
            self.history.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cpuPercent": cpu_percent,
                "memoryPercent": mem_percent,
                "maxWorkersAllowed": self.current_allowed
            })
            if len(self.history) > 60:
                self.history.pop(0)

class ReconstructionQueue:
    def __init__(self, monitor: SystemMonitor):
        self.monitor = monitor
        self.current_active = 0
        self.waiters = []

    async def enqueue(self):
        if self.current_active < self.monitor.current_allowed:
            self.current_active += 1
            return
        
        loop = asyncio.get_running_loop()
        fut = loop.create_future()
        self.waiters.append(fut)
        await fut

    def dequeue(self):
        self.current_active -= 1
        if self.current_active < self.monitor.current_allowed and self.waiters:
            self.current_active += 1
            fut = self.waiters.pop(0)
            if not fut.done():
                fut.set_result(None)

monitor = SystemMonitor()
queue = ReconstructionQueue(monitor)
