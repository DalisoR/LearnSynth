import { Job, JobQueue, JobProcessor, JobType } from './types';
import logger from '../../utils/logger';

export class InMemoryJobQueue implements JobQueue {
  private jobs: Map<string, Job> = new Map();
  private processors: Map<JobType, JobProcessor> = new Map();
  private isProcessing = false;

  registerProcessor(type: JobType, processor: JobProcessor): void {
    this.processors.set(type, processor);
  }

  async add(job: Omit<Job, 'id' | 'status' | 'createdAt'>): Promise<Job> {
    const fullJob: Job = {
      ...job,
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date(),
    };

    this.jobs.set(fullJob.id, fullJob);
    logger.info(`Job queued: ${fullJob.id} (${fullJob.type})`);

    // Process jobs in background
    this.processJobs();

    return fullJob;
  }

  async get(id: string): Promise<Job | null> {
    return this.jobs.get(id) || null;
  }

  async getAll(status?: Job['status']): Promise<Job[]> {
    const jobs = Array.from(this.jobs.values());
    return status ? jobs.filter(j => j.status === status) : jobs;
  }

  async update(id: string, updates: Partial<Job>): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, { ...job, ...updates });
    }
  }

  private async processJobs(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (true) {
      const pendingJob = Array.from(this.jobs.values()).find(
        j => j.status === 'pending'
      );

      if (!pendingJob) break;

      await this.processJob(pendingJob);
    }

    this.isProcessing = false;
  }

  private async processJob(job: Job): Promise<void> {
    const processor = this.processors.get(job.type);

    if (!processor) {
      logger.error(`No processor registered for job type: ${job.type}`);
      await this.update(job.id, {
        status: 'failed',
        error: `No processor for type: ${job.type}`,
      });
      return;
    }

    try {
      logger.info(`Processing job: ${job.id} (${job.type})`);
      await this.update(job.id, { status: 'processing' });

      await processor.process(job);

      await this.update(job.id, {
        status: 'completed',
        completedAt: new Date(),
      });

      logger.info(`Job completed: ${job.id}`);
    } catch (error) {
      logger.error(`Job failed: ${job.id}`, { error });
      await this.update(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
