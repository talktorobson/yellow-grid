import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert, ActivityIndicator } from 'react-native';
import { database } from '../db';
// @ts-ignore
import withObservables from '@nozbe/with-observables';
import Job from '../db/models/Job';
import TaskList from '../components/job/TaskList';
import { LocationService } from '../services/location/LocationService';
import { ExecutionService } from '../services/execution/ExecutionService';
import { PhotoCapture } from '../components/media/PhotoCapture';

const JobDetail = ({ job }: { job: Job }) => {
  const [loading, setLoading] = useState(false);

  if (!job) return <Text>Loading...</Text>;

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const location = await LocationService.getInstance().getCurrentLocation();
      await ExecutionService.getInstance().checkIn(job.jobId, location);
      
      // Update local DB status
      await database.write(async () => {
        await job.update(j => {
          j.status = 'in_progress';
          j.actualStart = new Date();
        });
      });
      
      Alert.alert('Success', 'Checked in successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const location = await LocationService.getInstance().getCurrentLocation();
      await ExecutionService.getInstance().checkOut(job.jobId, location);

      // Update local DB status
      await database.write(async () => {
        await job.update(j => {
          j.status = 'completed';
          j.actualEnd = new Date();
        });
      });

      Alert.alert('Success', 'Checked out successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Job Details</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.badgeText}>{job.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Priority:</Text>
        <Text style={styles.value}>{job.priority}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Scheduled:</Text>
        <Text style={styles.value}>{job.scheduledStart.toLocaleString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Location:</Text>
        <Text style={styles.value}>
          {job.location?.address?.street}, {job.location?.address?.city}
        </Text>
      </View>

      {job.notes && (
        <View style={styles.section}>
          <Text style={styles.label}>Notes:</Text>
          <Text style={styles.value}>{job.notes}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Button title="Check In" onPress={handleCheckIn} disabled={job.status !== 'assigned'} />
            <View style={{ height: 10 }} />
            <Button title="Check Out" onPress={handleCheckOut} disabled={job.status !== 'in_progress'} />
          </>
        )}
      </View>

      <PhotoCapture jobId={job.jobId} />

      <TaskList job={job} />
    </ScrollView>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'assigned': return '#3498db';
    case 'in_progress': return '#f1c40f';
    case 'completed': return '#2ecc71';
    default: return '#95a5a6';
  }
};

const enhance = withObservables(['route'], ({ route }: any) => ({
  job: database.collections.get<Job>('jobs').findAndObserve(route.params.jobId),
}));

export const JobDetailScreen = enhance(JobDetail);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  section: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  actions: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
});
