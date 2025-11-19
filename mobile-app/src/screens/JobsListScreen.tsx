import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { database } from '../db';
import { Q } from '@nozbe/watermelondb';
// @ts-ignore
import withObservables from '@nozbe/with-observables';
import Job from '../db/models/Job';
import { SyncService } from '../services/sync/SyncService';

const JobItem = ({ job, onPress }: { job: Job; onPress: () => void }) => (
  <TouchableOpacity style={styles.item} onPress={onPress}>
    <Text style={styles.title}>{job.priority} - {job.status}</Text>
    <Text>{job.scheduledStart.toLocaleDateString()}</Text>
  </TouchableOpacity>
);

const JobsList = ({ jobs }: { jobs: Job[] }) => {
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Trigger sync on load
    SyncService.getInstance().sync();
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobItem 
            job={item} 
            onPress={() => navigation.navigate('JobDetail', { jobId: item.id })} 
          />
        )}
      />
    </View>
  );
};

const enhance = withObservables([], () => ({
  jobs: database.collections.get<Job>('jobs').query(
    Q.sortBy('scheduled_start', Q.asc)
  ),
}));

export const JobsListScreen = enhance(JobsList);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  item: {
    backgroundColor: 'white',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
