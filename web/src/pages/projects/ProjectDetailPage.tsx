/**
 * Project Detail Page
 * Displays project information with ownership management
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectService } from '@/services';
import { ArrowLeft, UserCheck, Briefcase, MapPin, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import ProjectOwnershipModal from '@/components/projects/ProjectOwnershipModal';
import OperatorWorkloadWidget from '@/components/operators/OperatorWorkloadWidget';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Project Not Found</h3>
          <Link to="/projects" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors = {
      CREATED: 'badge-gray',
      IN_PROGRESS: 'badge-primary',
      COMPLETED: 'badge-success',
      CANCELLED: 'badge-danger',
    };
    return colors[status as keyof typeof colors] || 'badge-gray';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/projects"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Projects
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.externalId}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={clsx('badge', getStatusColor(project.status))}>
                {project.status}
              </span>
              <span className="text-sm text-gray-500">
                {project.countryCode} • {project.businessUnit}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Details */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Project Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">External ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{project.externalId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">{project.status}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Country</dt>
                <dd className="mt-1 text-sm text-gray-900">{project.countryCode}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Business Unit</dt>
                <dd className="mt-1 text-sm text-gray-900">{project.businessUnit}</dd>
              </div>
              {project.salesOrderId && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Sales Order ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{project.salesOrderId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Sales System</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {project.salesSystemSource || '-'}
                    </dd>
                  </div>
                </>
              )}
              {project.storeCode && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Store Code</dt>
                  <dd className="mt-1 text-sm text-gray-900">{project.storeCode}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Customer Information */}
          {(project.customerName || project.customerAddress || project.customerPhone || project.customerEmail) && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <dl className="grid grid-cols-2 gap-4">
                {project.customerName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Customer Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{project.customerName}</dd>
                  </div>
                )}
                {project.customerPhone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{project.customerPhone}</dd>
                  </div>
                )}
                {project.customerAddress && (
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{project.customerAddress}</dd>
                  </div>
                )}
                {project.customerEmail && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{project.customerEmail}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Project Ownership */}
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Project Owner (Pilote du Chantier)</h2>
              </div>
              <button
                onClick={() => setShowOwnershipModal(true)}
                className="btn btn-primary text-sm"
              >
                {project.projectOwnerName ? 'Change Owner' : 'Assign Owner'}
              </button>
            </div>

            {project.projectOwnerName ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <UserCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {project.projectOwnerName}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Assignment Mode:{' '}
                      <span className="font-semibold">
                        {project.projectOwnerAssignmentMode || 'MANUAL'}
                      </span>
                    </p>
                    {project.projectOwnerAssignmentMode === 'AUTO' && (
                      <p className="text-xs text-blue-600 mt-1">
                        ⚡ Automatically assigned by workload balancing algorithm
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">No project owner assigned</p>
                <p className="text-xs mt-1">Click "Assign Owner" to assign a responsible operator</p>
              </div>
            )}
          </div>

          {/* Service Orders */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Service Orders</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-600 font-medium mb-1">Total Orders</div>
                <div className="text-3xl font-bold text-purple-900">
                  {project.serviceOrderCount}
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 font-medium mb-1">Completed</div>
                <div className="text-3xl font-bold text-green-900">
                  {project.completedServiceOrderCount}
                </div>
              </div>
            </div>
            {project.serviceOrderCount > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-gray-900">
                    {Math.round((project.completedServiceOrderCount / project.serviceOrderCount) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(project.completedServiceOrderCount / project.serviceOrderCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Timeline</h2>
            </div>
            <dl className="space-y-2">
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">{format(new Date(project.createdAt), 'PPp')}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="text-gray-900">{format(new Date(project.updatedAt), 'PPp')}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Operator Workload */}
          <OperatorWorkloadWidget countryCode={project.countryCode} />

          {/* Quick Stats */}
          <div className="card">
            <h3 className="font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500">Business Unit</div>
                  <div className="text-sm font-medium">{project.businessUnit}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500">Country</div>
                  <div className="text-sm font-medium">{project.countryCode}</div>
                </div>
              </div>
              {project.storeCode && (
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Store Code</div>
                    <div className="text-sm font-medium">{project.storeCode}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Ownership Modal */}
      {showOwnershipModal && (
        <ProjectOwnershipModal
          projectId={project.id}
          projectExternalId={project.externalId}
          currentOwnerId={project.projectOwnerId}
          currentOwnerName={project.projectOwnerName}
          countryCode={project.countryCode}
          onClose={() => setShowOwnershipModal(false)}
          onSuccess={() => {
            setShowOwnershipModal(false);
            // Project data will be automatically refreshed by React Query
          }}
        />
      )}
    </div>
  );
}
