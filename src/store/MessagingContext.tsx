import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  classChannels,
  communicationHours,
  conversations as mockConversationsData,
  initialChannelMessages,
  initialDirectMessages,
  subjects,
} from "../data/mockData";
import type {
  ChatMessage,
  ClassChannel,
  Conversation,
  DirectMessage,
  MessageAuthorRole,
} from "../types";
import { nowLocalIso } from "../dateUtils";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { listUsers, subscribeToUsers, type SchoolUserRecord } from "../services/usersService";
import {
  fetchChannelMessages,
  fetchDirectMessages,
  sendMessage,
  subscribeToMessages,
  type RawMessage,
} from "../services/messagingService";

const CHANNEL_MSG_KEY = "schola.channelMessages.v1";
const DM_KEY = "schola.directMessages.v1";
const CHANNEL_READ_KEY = "schola.channelLastRead.v1";
const CONVERSATION_READ_KEY = "schola.conversationLastRead.v1";

export const CURRENT_STUDENT_NAME = "Amara Silva";

function loadMap(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : fallback;
  } catch {
    return fallback;
  }
}

interface MessagingContextValue {
  channels: ClassChannel[];
  conversations: Conversation[];
  /** Read-only student↔teacher pairs this viewer may observe but isn't part of (admin: all; parent: their child). */
  oversightPairs: Conversation[];
  communicationHours: { start: string; end: string };
  channelMessages: ChatMessage[];
  directMessages: DirectMessage[];
  channelLastRead: Record<string, string>;
  conversationLastRead: Record<string, string>;
  getChannelMessages: (channelId: string) => ChatMessage[];
  postChannelMessage: (channelId: string, body: string) => Promise<boolean>;
  votePoll: (messageId: string, optionId: string) => void;
  getConversationMessages: (conversationId: string) => DirectMessage[];
  postDirectMessage: (conversationId: string, body: string) => Promise<boolean>;
  postDirectMessageAs: (conversationId: string, senderRole: MessageAuthorRole, body: string) => Promise<boolean>;
  markChannelRead: (channelId: string) => void;
  markConversationRead: (conversationId: string) => void;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

/** Encodes a 1:1 DM as a stable id regardless of who's asking — "::" can't appear inside a uuid. */
function dmId(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `dm::${x}::${y}`;
}

function parseDmId(id: string): [string, string] | null {
  const parts = id.split("::");
  if (parts.length !== 3 || parts[0] !== "dm") return null;
  return [parts[1], parts[2]];
}

function useReadTracking() {
  const [channelLastRead, setChannelLastRead] = useState<Record<string, string>>(() => loadMap(CHANNEL_READ_KEY));
  const [conversationLastRead, setConversationLastRead] = useState<Record<string, string>>(() =>
    loadMap(CONVERSATION_READ_KEY),
  );

  useEffect(() => {
    try {
      localStorage.setItem(CHANNEL_READ_KEY, JSON.stringify(channelLastRead));
    } catch {
      // ignore storage errors
    }
  }, [channelLastRead]);

  useEffect(() => {
    try {
      localStorage.setItem(CONVERSATION_READ_KEY, JSON.stringify(conversationLastRead));
    } catch {
      // ignore storage errors
    }
  }, [conversationLastRead]);

  return {
    channelLastRead,
    conversationLastRead,
    markChannelRead: (channelId: string) =>
      setChannelLastRead((prev) => ({ ...prev, [channelId]: nowLocalIso() })),
    markConversationRead: (conversationId: string) =>
      setConversationLastRead((prev) => ({ ...prev, [conversationId]: nowLocalIso() })),
  };
}

/** Real, Supabase-backed messaging for actual logged-in accounts. */
function RealMessagingProvider({ profile, children }: { profile: SchoolUserRecord; children: ReactNode }) {
  const [allUsers, setAllUsers] = useState<SchoolUserRecord[]>([profile]);
  const [rawMessages, setRawMessages] = useState<RawMessage[]>([]);
  const { channelLastRead, conversationLastRead, markChannelRead, markConversationRead } = useReadTracking();

  useEffect(() => {
    let cancelled = false;
    listUsers()
      .then((users) => {
        if (!cancelled) setAllUsers(users);
      })
      .catch(() => {
        if (!cancelled) setAllUsers([profile]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return subscribeToUsers(
      (user) => setAllUsers((prev) => (prev.some((u) => u.id === user.id) ? prev : [...prev, user])),
      (id) => setAllUsers((prev) => prev.filter((u) => u.id !== id)),
      (user) => setAllUsers((prev) => prev.map((u) => (u.id === user.id ? user : u))),
    );
  }, []);

  const usersById = useMemo(() => new Map(allUsers.map((u) => [u.id, u])), [allUsers]);
  const teachers = useMemo(() => allUsers.filter((u) => u.role === "teacher"), [allUsers]);
  const students = useMemo(() => allUsers.filter((u) => u.role === "student"), [allUsers]);
  const admins = useMemo(() => allUsers.filter((u) => u.role === "admin"), [allUsers]);

  const channels: ClassChannel[] = useMemo(
    () =>
      teachers.map((t) => {
        const matched = subjects.find((s) => s.name.toLowerCase() === (t.subject_name ?? "").toLowerCase());
        return {
          id: `class-${t.id}`,
          subjectId: matched?.id ?? "general",
          section: "Class",
          mode: "open" as const,
          real: {
            teacherId: t.id,
            teacherName: t.name,
            label: t.subject_name || "Class",
            color: matched?.color ?? "#2563EB",
            icon: matched?.icon ?? "BookOpen",
          },
        };
      }),
    [teachers],
  );

  const conversations: Conversation[] = useMemo(() => {
    const asRealDm = (
      otherId: string,
      otherName: string,
      otherRole: MessageAuthorRole,
      officeHours?: { start: string; end: string } | null,
    ): Conversation => ({
      id: dmId(profile.id, otherId),
      kind: "real-dm",
      dmDisabled: false,
      real: { otherUserId: otherId, otherUserName: otherName, otherUserRole: otherRole, officeHours },
    });

    const teacherOfficeHours = (t: SchoolUserRecord) =>
      t.office_hours_start && t.office_hours_end ? { start: t.office_hours_start, end: t.office_hours_end } : null;

    const otherAdmins = admins.filter((a) => a.id !== profile.id);

    if (profile.role === "student") {
      return teachers.map((t) => asRealDm(t.id, t.name, "teacher", teacherOfficeHours(t)));
    }
    if (profile.role === "teacher") {
      return [
        ...otherAdmins.map((a) => asRealDm(a.id, a.name, "admin")),
        ...students.map((s) => asRealDm(s.id, s.name, "student")),
      ];
    }
    if (profile.role === "admin") {
      return [
        ...otherAdmins.map((a) => asRealDm(a.id, a.name, "admin")),
        ...teachers.map((t) => asRealDm(t.id, t.name, "teacher", teacherOfficeHours(t))),
        ...students.map((s) => asRealDm(s.id, s.name, "student")),
      ];
    }
    return [];
  }, [profile, teachers, students, admins]);

  // Read-only oversight pairs: every student↔teacher DM a third party (admin: all; parent: their
  // own child) is allowed to observe but isn't a participant in — distinct from `conversations`,
  // which is this viewer's own threads.
  const oversightPairs: Conversation[] = useMemo(() => {
    const observedStudents =
      profile.role === "admin" ? students : profile.role === "parent" ? students.filter((s) => s.id === profile.linked_student_id) : [];
    return observedStudents.flatMap((s) =>
      teachers.map((t) => ({
        id: dmId(s.id, t.id),
        kind: "real-dm" as const,
        dmDisabled: false,
        real: {
          otherUserId: t.id,
          otherUserName: t.name,
          otherUserRole: "teacher" as const,
          observedStudentName: s.name,
        },
      })),
    );
  }, [profile, teachers, students]);

  // Initial load of every message relevant to this session.
  useEffect(() => {
    const allPairs = [...conversations, ...oversightPairs];
    if (channels.length === 0 && allPairs.length === 0) return;
    let cancelled = false;
    Promise.all([
      ...channels.map((c) => fetchChannelMessages(c.id)),
      ...allPairs.map((c) => {
        const pair = parseDmId(c.id);
        return pair ? fetchDirectMessages(pair[0], pair[1]) : Promise.resolve([]);
      }),
    ])
      .then((results) => {
        if (cancelled) return;
        const flat = results.flat();
        setRawMessages((prev) => {
          const merged = [...prev];
          for (const m of flat) {
            if (!merged.some((x) => x.id === m.id)) merged.push(m);
          }
          return merged;
        });
      })
      .catch(() => {
        // leave whatever's already loaded in place
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels.length, conversations.length, oversightPairs.length]);

  // Live updates: append any new message relevant to a channel/conversation we know about.
  useEffect(() => {
    const channelIds = new Set(channels.map((c) => c.id));
    const pairIds = new Set([...conversations, ...oversightPairs].map((c) => c.id));
    const unsubscribe = subscribeToMessages((m) => {
      const relevant = m.channel_id
        ? channelIds.has(m.channel_id)
        : m.recipient_id
          ? pairIds.has(dmId(m.sender_id, m.recipient_id))
          : false;
      if (!relevant) return;
      setRawMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    return unsubscribe;
  }, [channels, conversations, oversightPairs]);

  const toChatMessage = (m: RawMessage): ChatMessage => {
    const sender = usersById.get(m.sender_id);
    return {
      id: m.id,
      channelId: m.channel_id ?? "",
      authorRole: (sender?.role as MessageAuthorRole) ?? "student",
      authorName: sender?.name ?? "Unknown",
      body: m.body,
      timestamp: m.created_at,
    };
  };

  const toDirectMessage = (m: RawMessage): DirectMessage => {
    const sender = usersById.get(m.sender_id);
    return {
      id: m.id,
      conversationId: dmId(m.sender_id, m.recipient_id ?? m.sender_id),
      senderRole: (sender?.role as MessageAuthorRole) ?? "student",
      body: m.body,
      timestamp: m.created_at,
    };
  };

  const getChannelMessages = (channelId: string) =>
    rawMessages
      .filter((m) => m.channel_id === channelId)
      .map(toChatMessage)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const getConversationMessages = (conversationId: string) => {
    const pair = parseDmId(conversationId);
    if (!pair) return [];
    return rawMessages
      .filter(
        (m) =>
          m.channel_id === null &&
          ((m.sender_id === pair[0] && m.recipient_id === pair[1]) ||
            (m.sender_id === pair[1] && m.recipient_id === pair[0])),
      )
      .map(toDirectMessage)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  };

  const postChannelMessage = async (channelId: string, body: string): Promise<boolean> => {
    const trimmed = body.trim();
    if (!trimmed) return false;
    try {
      const m = await sendMessage({ channelId, senderId: profile.id, body: trimmed });
      setRawMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      return true;
    } catch {
      return false;
    }
  };

  const postDirectMessageAs = async (
    conversationId: string,
    _senderRole: MessageAuthorRole,
    body: string,
  ): Promise<boolean> => {
    const trimmed = body.trim();
    if (!trimmed) return false;
    const pair = parseDmId(conversationId);
    if (!pair) return false;
    const recipientId = pair[0] === profile.id ? pair[1] : pair[0];
    try {
      const m = await sendMessage({ senderId: profile.id, recipientId, body: trimmed });
      setRawMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      return true;
    } catch {
      return false;
    }
  };

  const postDirectMessage = (conversationId: string, body: string) =>
    postDirectMessageAs(conversationId, profile.role as MessageAuthorRole, body);

  const value: MessagingContextValue = {
    channels,
    conversations,
    oversightPairs,
    communicationHours,
    channelMessages: rawMessages.filter((m) => m.channel_id).map(toChatMessage),
    directMessages: rawMessages.filter((m) => !m.channel_id).map(toDirectMessage),
    channelLastRead,
    conversationLastRead,
    getChannelMessages,
    postChannelMessage,
    votePoll: () => {
      // Polls aren't part of the real messages schema yet — no-op.
    },
    getConversationMessages,
    postDirectMessage,
    postDirectMessageAs,
    markChannelRead,
    markConversationRead,
  };

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

/** Mock, localStorage-backed messaging — used when Supabase isn't configured (demo mode). */
function MockMessagingProvider({ children }: { children: ReactNode }) {
  const [channelMessages, setChannelMessages] = useState<ChatMessage[]>(() =>
    loadFromStorage(CHANNEL_MSG_KEY, initialChannelMessages),
  );
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() =>
    loadFromStorage(DM_KEY, initialDirectMessages),
  );
  const { channelLastRead, conversationLastRead, markChannelRead, markConversationRead } = useReadTracking();

  useEffect(() => {
    try {
      localStorage.setItem(CHANNEL_MSG_KEY, JSON.stringify(channelMessages));
    } catch {
      // ignore quota errors in this prototype
    }
  }, [channelMessages]);

  useEffect(() => {
    try {
      localStorage.setItem(DM_KEY, JSON.stringify(directMessages));
    } catch {
      // ignore quota errors in this prototype
    }
  }, [directMessages]);

  const getChannelMessages = (channelId: string) =>
    channelMessages.filter((m) => m.channelId === channelId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const postChannelMessage = async (channelId: string, body: string): Promise<boolean> => {
    const trimmed = body.trim();
    if (!trimmed) return false;
    const message: ChatMessage = {
      id: `cm-${Date.now()}`,
      channelId,
      authorRole: "student",
      authorName: CURRENT_STUDENT_NAME,
      body: trimmed,
      timestamp: nowLocalIso(),
    };
    setChannelMessages((prev) => [...prev, message]);
    return true;
  };

  const votePoll = (messageId: string, optionId: string) => {
    setChannelMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.poll) return m;
        if (m.poll.votedOptionId) return m;
        return {
          ...m,
          poll: {
            ...m.poll,
            votedOptionId: optionId,
            options: m.poll.options.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o)),
          },
        };
      }),
    );
  };

  const getConversationMessages = (conversationId: string) =>
    directMessages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const postDirectMessageAs = async (
    conversationId: string,
    senderRole: MessageAuthorRole,
    body: string,
  ): Promise<boolean> => {
    const trimmed = body.trim();
    if (!trimmed) return false;
    const message: DirectMessage = {
      id: `dm-${Date.now()}`,
      conversationId,
      senderRole,
      body: trimmed,
      timestamp: nowLocalIso(),
    };
    setDirectMessages((prev) => [...prev, message]);
    return true;
  };

  const postDirectMessage = (conversationId: string, body: string) =>
    postDirectMessageAs(conversationId, "student", body);

  const value: MessagingContextValue = {
    channels: classChannels,
    conversations: mockConversationsData,
    oversightPairs: mockConversationsData,
    communicationHours,
    channelMessages,
    directMessages,
    channelLastRead,
    conversationLastRead,
    getChannelMessages,
    postChannelMessage,
    votePoll,
    getConversationMessages,
    postDirectMessage,
    postDirectMessageAs,
    markChannelRead,
    markConversationRead,
  };

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (isSupabaseConfigured && profile) {
    return <RealMessagingProvider profile={profile}>{children}</RealMessagingProvider>;
  }
  return <MockMessagingProvider>{children}</MockMessagingProvider>;
}

export function useMessaging(): MessagingContextValue {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error("useMessaging must be used within MessagingProvider");
  return ctx;
}
