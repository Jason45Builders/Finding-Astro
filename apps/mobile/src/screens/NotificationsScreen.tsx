import { useEffect } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { notificationService } from "../services/notification.service";
import { useAppDispatch, useAppSelector } from "../store";
import { setCaseError, setNotifications } from "../store/caseSlice";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

const NotificationsScreen = () => {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.session?.token);
  const notifications = useAppSelector((state) => state.cases.notifications);

  const loadNotifications = async () => {
    if (!token) {
      return;
    }

    try {
      const items = await notificationService.listNotifications(token);
      dispatch(setNotifications(items));
      dispatch(setCaseError(null));
    } catch (error) {
      dispatch(setCaseError(error instanceof Error ? error.message : "Unable to load notifications."));
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [token]);

  const markRead = async (notificationId: string) => {
    if (!token) {
      return;
    }

    try {
      await notificationService.markRead(token, notificationId);
      await loadNotifications();
    } catch (error) {
      Alert.alert("Failed", error instanceof Error ? error.message : "Unable to update notification.");
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {notifications.map((item) => (
        <Pressable
          key={item.id}
          style={[styles.card, item.readAt ? styles.cardRead : null]}
          onPress={() => void markRead(item.id)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.badge}>{item.type}</Text>
          </View>
          <Text style={styles.cardText}>{item.message}</Text>
          <Text style={styles.cardMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 20,
    gap: 12
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 8
  },
  cardRead: {
    opacity: 0.7
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  cardTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
    flex: 1
  },
  badge: {
    ...typography.caption,
    color: colors.accentDeep
  },
  cardText: {
    ...typography.body,
    color: colors.textSecondary
  },
  cardMeta: {
    ...typography.caption,
    color: colors.textSecondary
  }
});

export default NotificationsScreen;
