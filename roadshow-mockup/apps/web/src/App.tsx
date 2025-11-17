import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ServiceOrders from './pages/ServiceOrders';
import ServiceOrderDetail from './pages/ServiceOrderDetail';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import Executions from './pages/Executions';
import ExecutionDetail from './pages/ExecutionDetail';
import Providers from './pages/Providers';
import ProviderDetail from './pages/ProviderDetail';
import Tasks from './pages/Tasks';
import WCFs from './pages/WCFs';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="service-orders" element={<ServiceOrders />} />
        <Route path="service-orders/:id" element={<ServiceOrderDetail />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="assignments/:id" element={<AssignmentDetail />} />
        <Route path="executions" element={<Executions />} />
        <Route path="executions/:id" element={<ExecutionDetail />} />
        <Route path="providers" element={<Providers />} />
        <Route path="providers/:id" element={<ProviderDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="wcfs" element={<WCFs />} />
      </Route>
    </Routes>
  );
}

export default App;
