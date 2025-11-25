/**
 * Document Service
 * API calls for document and note management on service orders
 */

import apiClient from './api-client';
import { UUID, ISODateString } from '@/types';

interface ApiResponse<T> {
  data: T;
  meta: any;
}

// Document types
export enum DocumentType {
  NOTE = 'NOTE',
  PHOTO = 'PHOTO',
  PDF = 'PDF',
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE',
  OTHER = 'OTHER',
}

export enum NoteType {
  GENERAL = 'GENERAL',
  CUSTOMER_PREFERENCE = 'CUSTOMER_PREFERENCE',
  TECHNICAL = 'TECHNICAL',
  SAFETY = 'SAFETY',
}

export enum NotePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum NoteVisibility {
  ALL = 'ALL',
  OPERATORS_ONLY = 'OPERATORS_ONLY',
  PROVIDERS_ONLY = 'PROVIDERS_ONLY',
}

// Document interface
export interface Document {
  id: UUID;
  serviceOrderId: UUID;
  type: DocumentType;
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// Note interface
export interface Note {
  id: UUID;
  serviceOrderId: UUID;
  noteType: NoteType;
  title: string;
  content: string;
  priority: NotePriority;
  visibility: NoteVisibility;
  createdBy: string;
  createdByName?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// DTOs
export interface UploadDocumentDto {
  file: File;
  documentType: DocumentType;
  title: string;
  description?: string;
}

export interface CreateNoteDto {
  noteType: NoteType;
  title: string;
  content: string;
  priority: NotePriority;
  visibility: NoteVisibility;
}

export interface DocumentsAndNotesResponse {
  documents: Document[];
  notes: Note[];
  totalCount: number;
}

class DocumentService {
  /**
   * Upload a document to a service order
   */
  async uploadDocument(
    serviceOrderId: string,
    data: UploadDocumentDto
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('documentType', data.documentType);
    formData.append('title', data.title);
    if (data.description) {
      formData.append('description', data.description);
    }

    const response = await apiClient.post<ApiResponse<Document>>(
      `/service-orders/${serviceOrderId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  }

  /**
   * Create a note for a service order
   */
  async createNote(
    serviceOrderId: string,
    data: CreateNoteDto
  ): Promise<Note> {
    const response = await apiClient.post<ApiResponse<Note>>(
      `/service-orders/${serviceOrderId}/notes`,
      data
    );
    return response.data.data;
  }

  /**
   * Get all documents and notes for a service order
   */
  async getDocumentsAndNotes(
    serviceOrderId: string
  ): Promise<DocumentsAndNotesResponse> {
    const response = await apiClient.get<ApiResponse<DocumentsAndNotesResponse>>(
      `/service-orders/${serviceOrderId}/documents-and-notes`
    );
    return response.data.data;
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await apiClient.delete(`/documents/${documentId}`);
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<void> {
    await apiClient.delete(`/notes/${noteId}`);
  }

  /**
   * Update a note
   */
  async updateNote(
    noteId: string,
    data: Partial<CreateNoteDto>
  ): Promise<Note> {
    const response = await apiClient.patch<ApiResponse<Note>>(`/notes/${noteId}`, data);
    return response.data.data;
  }

  /**
   * Download a document
   */
  getDocumentDownloadUrl(documentId: string): string {
    return `${apiClient.defaults.baseURL}/cockpit/documents/${documentId}/download`;
  }
}

export const documentService = new DocumentService();
