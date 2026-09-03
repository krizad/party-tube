import { PrismaService } from '../prisma/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    check(): Promise<{
        status: string;
        service: string;
        environment: string;
        nodeVersion: string;
        pid: number;
        uptimeSeconds: number;
        timestamp: string;
        database: {
            status: "connected" | "disconnected";
            latencyMs: number;
        };
        memory: {
            rssMb: number;
            heapUsedMb: number;
            heapTotalMb: number;
        };
    }>;
}
