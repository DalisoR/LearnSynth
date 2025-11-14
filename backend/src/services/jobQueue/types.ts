export type JobType = 'process_document' | 'generate_lesson' | 'create_embeddings' | 'generate_audio';

export interface Job {
  id: string;
  type: JobType;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface JobProcessor {
  process(job: Job): Promise<void>;
}

export interface JobQueue {
  add(job: Omit<Job, 'id' | 'status' | 'createdAt'>): Promise<Job>;
  get(id: string): Promise<Job | null>;
  getAll(status?: Job['status']): Promise<Job[]>;
  update(id: string, updates: Partial<Job>): Promise<void>;
}
