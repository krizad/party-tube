import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller(['health', 'api/health'])
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const start = Date.now();
    let databaseStatus: 'connected' | 'disconnected' = 'disconnected';
    let latencyMs: number | undefined;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
      latencyMs = Date.now() - start;
    } catch {
      databaseStatus = 'disconnected';
    }

    const memory = process.memoryUsage();

    return {
      status: databaseStatus === 'connected' ? 'ok' : 'degraded',
      service: 'partytube-api',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: databaseStatus,
        latencyMs,
      },
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      },
    };
  }
}
