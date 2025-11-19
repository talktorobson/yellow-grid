import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { withObservables } from '@nozbe/watermelondb/react';
import Task from '../../db/models/Task';

const TaskItem = ({ task }: { task: Task }) => (
  <View style={styles.item}>
    <View style={styles.header}>
      <Text style={styles.description}>{task.description}</Text>
      <Text style={styles.status}>{task.status}</Text>
    </View>
    <Text>Est. Hours: {task.estimatedHours}</Text>
  </View>
);

const TaskList = ({ tasks }: { tasks: Task[] }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks</Text>
      {tasks.length === 0 ? (
        <Text style={styles.empty}>No tasks assigned</Text>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TaskItem task={item} />}
          scrollEnabled={false}
        />
      )}
    </View>
  );
};

const enhance = withObservables(['job'], ({ job }) => ({
  tasks: job.tasks,
}));

export default enhance(TaskList);

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  item: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  status: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  empty: {
    fontStyle: 'italic',
    color: '#999',
  },
});
