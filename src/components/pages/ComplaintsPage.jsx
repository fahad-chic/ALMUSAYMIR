// src/components/pages/ComplaintsPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';

import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  UserX,
  UserCheck,
  Home,
  Package,
  Users,
  MessageCircle,
  Megaphone,
  MessageSquare,
  Settings,
  Bell,
  Send
} from 'lucide-react';

import AdsPage from '../../pages/AdsPage';
import UsersList from '../../pages/UsersList';

// محادثة مباشرة بين المالك وعضو عبر مجموعة messages — كانت اللوحة تستدعي
// ChatPage (المصمم لشات حراج بمعرّفَي chatPartnerId+adId) بخصائص otherUser/
// onBack غير موجودة فيه فكان تبويب «المراسلات» مكسوراً تماماً.
const OwnerMessageThread = ({ member, onBack }) => {
  const { user } = useAuth();
  const [thread, setThread] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsubs = [];
    const merge = {};
    const push = (key) => (snap) => {
      merge[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const all = [...(merge.incoming || []), ...(merge.outgoing || [])].sort(
        (a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)
      );
      setThread(all);
    };
    unsubs.push(
      onSnapshot(
        query(collection(db, 'messages'), where('senderId', '==', member.id)),
        push('incoming'),
        () => {}
      )
    );
    unsubs.push(
      onSnapshot(
        query(collection(db, 'messages'), where('receiverId', '==', member.id)),
        push('outgoing'),
        () => {}
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [member.id]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        text: body,
        senderId: 'admin',
        ownerId: user?.uid || null,
        receiverId: member.id,
        userName: member.name || member.email,
        adminMessage: true,
        read: false,
        createdAt: serverTimestamp(),
      });
      setText('');
    } catch (error) {
      console.error('send message error:', error);
      alert('تعذر إرسال الرسالة.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass-morphism-gold rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="text-sm text-luxury-gold border border-luxury-gold/40 rounded-lg px-3 py-1.5"
        >
          ← رجوع
        </button>
        <h3 className="text-luxury-gold font-bold">
          مراسلة: {member.name || member.email}
        </h3>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-2 mb-4">
        {thread.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">لا توجد رسائل بعد.</p>
        )}
        {thread.map((m) => {
          const fromAdmin = m.adminMessage || m.senderId === 'admin';
          return (
            <div key={m.id} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  fromAdmin ? 'bg-luxury-gold/90 text-black' : 'bg-gray-800 text-gray-100'
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="اكتب رسالتك للعضو..."
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="bg-luxury-gold text-black rounded-lg px-4 py-2 font-bold disabled:opacity-50 flex items-center gap-1"
        >
          <Send size={16} />
          إرسال
        </button>
      </div>
    </div>
  );
};

const ComplaintsPage = () => {
  const { user, userRole, logAction } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState(null);

  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [ads, setAds] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', category: 'general' });
  const [editingId, setEditingId] = useState(null);

  const [marqueeText, setMarqueeText] = useState('');

  useEffect(() => {
    if (userRole !== 'owner') return;

    const safeSubscribe = (path, q) => {
      try {
        return onSnapshot(q || collection(db, path), snap =>
          setStateByPath(path, snap.docs.map(d => ({ id: d.id, ...d.data() })))
        );
      } catch {
        setStateByPath(path, []);
        return () => {};
      }
    };

    const setStateByPath = (path, data) => {
      if (path === 'products') setProducts(data);
      else if (path === 'users') setUsers(data);
      else if (path === 'logs') setLogs(data);
      else if (path === 'privateMessages') setMessages(data);
      else if (path === 'ads') setAds(data);
    };

    const unsubProducts = safeSubscribe(
      'products',
      query(collection(db, 'products'), orderBy('createdAt', 'desc'))
    );

    const unsubUsers = safeSubscribe('users', query(collection(db, 'users')));

    const unsubLogs = safeSubscribe(
      'logs',
      query(collection(db, 'logs'), orderBy('time', 'desc'))
    );

    const unsubMessages = safeSubscribe(
      'privateMessages',
      query(collection(db, 'privateMessages'), orderBy('time', 'desc'))
    );

    const unsubAds = safeSubscribe(
      'ads',
      query(collection(db, 'ads'), orderBy('createdAt', 'desc'))
    );
    return () => {
  unsubProducts();
  unsubUsers();
  unsubLogs();
  unsubMessages();
  unsubAds();
};
}, [userRole]);

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!formData.name.trim() || !formData.price) return;

  try {
    if (editingId) {
      await updateDoc(doc(db, 'products', editingId), {
        ...formData,
        price: Number(formData.price),
      });
      await logAction('UPDATE_PRODUCT', formData.name);
    } else {
      await addDoc(collection(db, 'products'), {
        ...formData,
        price: Number(formData.price),
        createdAt: serverTimestamp(),
      });
      await logAction('ADD_PRODUCT', formData.name);
    }

    setFormData({ name: '', price: '', category: 'general' });
    setShowForm(false);
    setEditingId(null);
  } catch (error) {
    console.error('خطأ في حفظ المنتج:', error);
  }
};

const handleDelete = async (id, name) => {
  if (window.confirm('هل تريد حذف هذه السلعة فعلاً؟')) {
    try {
      await deleteDoc(doc(db, 'products', id));
      await logAction('DELETE_PRODUCT', name);
    } catch (error) {
      console.error('خطأ في حذف المنتج:', error);
    }
  }
};

const handleBanUser = async (id, email, status) => {
  try {
    await updateDoc(doc(db, 'users', id), { status });
    await logAction(status === 'banned' ? 'BAN_USER' : 'UNBAN_USER', email);
  } catch (error) {
    console.error('خطأ في تحديث حالة المستخدم:', error);
  }
};

const handlePromoteUser = async (id, email, role) => {
  try {
    await updateDoc(doc(db, 'users', id), { role });
    await logAction('PROMOTE_USER', `${email} to ${role}`);
  } catch (error) {
    console.error('خطأ في ترقية المستخدم:', error);
  }
};

const handleDeleteMessage = async (id) => {
  if (window.confirm('حذف هذه الرسالة؟')) {
    try {
      await deleteDoc(doc(db, 'privateMessages', id));
      await logAction('DELETE_MESSAGE', id);
    } catch (error) {
      console.error('خطأ في حذف الرسالة:', error);
    }
  }
};

const handleDeleteAd = async (id) => {
  if (window.confirm('حذف هذا الاعلان؟')) {
    try {
      await deleteDoc(doc(db, 'ads', id));
      await logAction('DELETE_AD', id);
    } catch (error) {
      console.error('خطأ في حذف الاعلان:', error);
    }
  }
};

const handleMarquee = async () => {
  try {
    await updateDoc(doc(db, 'siteSettings', 'global'), { marquee: marqueeText });
    await logAction('MARQUEE_UPDATE', marqueeText);
  } catch (error) {
    console.error('خطأ في تحديث النص المتحرك:', error);
  }
};

if (userRole !== 'owner') {
  return (
    <div className="min-h-screen w-full flex items-center justify-center text-center text-red-500 font-Tajawal">
      <div className="glass-morphism-gold p-6 rounded-xl">
        <h2 className="text-2xl font-bold mb-2">ممنوع الدخول </h2>
        <p className="text-gray-300 text-sm">
          هذه الصفحة خاصة بصاحب الموقع فقط، ولا يُسمح لأي مستخدم آخر بالوصول إليها.
        </p>
      </div>
    </div>
  );
}

const tabs = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: Home },
  { id: 'products', label: 'المنتجات', icon: Package },
  { id: 'users', label: 'المستخدمين', icon: Users },
  { id: 'chat', label: 'الدردشة', icon: MessageCircle },
  { id: 'ads', label: 'الاعلانات', icon: Megaphone },
  { id: 'monitoring', label: 'المراقبة', icon: MessageSquare },
  { id: 'settings', label: 'الاعدادات', icon: Settings },
  { id: 'logs', label: 'السجل', icon: Bell },
];

return (
  <div className="min-h-screen w-full" style={{ background: 'var(--rz-ink)', padding: 20 }}>
    <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--rz-gold)' }}>
       المطبخ الخلفي
    </h1>

    <div className="glass-morphism-gold p-3 rounded-lg text-xs text-red-300 mb-4">
       جميع بيانات الزائرين والمستخدمين في منصة المسيمير | ALMUSAYMIR تعتبر خط أحمر،
      ومحمية وفق بروتوكولات أمان حديثة مثل AES-256، ولا يملك صلاحية الاطلاع الكامل
      على البيانات والإعلانات والرسائل الخاصة إلا صاحب الموقع فقط.
    </div>

      <div className="flex flex-wrap justify-center gap-2 mb-6 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedUser(null);
            }}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id ? 'bg-luxury-gold text-black' : 'bg-gray-800 text-luxury-gold'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="glass-morphism-gold rounded-lg p-6 text-sm text-luxury-gold">
          مرحبا بك يا صاحب الموقع، هنا يمكنك إدارة كل صغيرة وكبيرة في المنصة،
          من المستخدمين والمنتجات والإعلانات والرسائل الخاصة والسجل الحي.
        </div>
      )}

      {activeTab === 'products' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ color: 'var(--rz-gold)' }}>إدارة السلع والاسعار</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-gold flex items-center gap-2 text-xs"
            >
              <Plus size={18} /> سلعة جديدة
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="glass-morphism-gold rounded-lg p-6 mb-8 text-sm"
            >
              <input
                placeholder="اسم السلعة"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-gold w-full mb-2 text-xs"
              />
              <input
                placeholder="السعر"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input-gold w-full mb-2 text-xs"
              />
              <button type="submit" className="btn-gold w-full text-xs">
                {editingId ? 'تحديث' : 'إضافة'}
              </button>
            </form>
          )}

          <table className="w-full text-xs glass-morphism-gold rounded-lg">
            <thead>
              <tr>
                <th className="p-3 text-right">الاسم</th>
                <th>السعر</th>
                <th>الاجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">{p.name}</td>
                  <td>{p.price} ريال</td>
                  <td className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(p.id);
                        setFormData(p);
                        setShowForm(true);
                      }}
                      title="تعديل"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      title="حذف"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {activeTab === 'users' && (
        <>
          <h2 style={{ color: 'var(--rz-gold)', marginBottom: 10 }}>إدارة المستخدمين</h2>
          <table className="w-full text-xs glass-morphism-gold rounded-lg">
            <thead>
              <tr>
                <th className="p-3 text-right">الايميل</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>الاجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-3">{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.status}</td>
                  <td className="flex gap-2">
                    <button
                      onClick={() => handleBanUser(u.id, u.email, 'banned')}
                      title="طرد"
                    >
                      <UserX size={16} className="text-red-500" />
                    </button>
                    <button
                      onClick={() => handleBanUser(u.id, u.email, 'active')}
                      title="ارجاع"
                    >
                      <UserCheck size={16} className="text-green-400" />
                    </button>
                    <button
                      onClick={() => handlePromoteUser(u.id, u.email, 'admin')}
                      title="ترقية ادمن"
                    >
                      <Shield size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {activeTab === 'chat' && (
        selectedUser ? (
          <OwnerMessageThread member={selectedUser} onBack={() => setSelectedUser(null)} />
        ) : (
          <UsersList onSelectUser={(u) => setSelectedUser(u)} />
        )
      )}

      {activeTab === 'ads' && <AdsPage />}

      {activeTab === 'monitoring' && (
        <div className="glass-morphism-gold rounded-lg p-6 text-xs">
          <h2 style={{ color: 'var(--rz-gold)' }} className="mb-4">
            مراقبة الرسائل والاعلانات
          </h2>

          <h3 className="text-luxury-gold mb-2">الرسائل الخاصة</h3>
          <div className="max-h-60 overflow-y-auto mb-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className="flex justify-between border-b border-luxury-gold/10 py-1"
              >
                <p>
                  <b>{m.fromEmail}</b> الى <b>{m.toEmail}</b>: {m.message}
                </p>
                <button onClick={() => handleDeleteMessage(m.id)} title="حذف">
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>

          <h3 className="text-luxury-gold mb-2">الاعلانات</h3>
          <div className="max-h-60 overflow-y-auto">
            {ads.map((a) => (
              <div
                key={a.id}
                className="flex justify-between border-b border-luxury-gold/10 py-1"
              >
                <p>
                  <b>{a.byEmail}</b>: {a.content}
                </p>
                <button onClick={() => handleDeleteAd(a.id)} title="حذف">
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="glass-morphism-gold rounded-lg p-4 mb-6 text-xs">
          <h2 style={{ color: 'var(--rz-gold)' }}>الشريط المتحرك لكل الموقع</h2>
          <input
            value={marqueeText}
            onChange={(e) => setMarqueeText(e.target.value)}
            placeholder="مثال: تخفيضات 50%"
            className="input-gold w-full mb-2 text-xs"
          />
          <button onClick={handleMarquee} className="btn-gold text-xs">
            نشر للكل
          </button>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="glass-morphism-gold rounded-lg p-4 my-6 text-xs">
          <h2 style={{ color: 'var(--rz-gold)' }}>سجل الاحداث الحية</h2>
          <div style={{ height: 200, overflowY: 'scroll' }}>
            {logs.map((l) => (
              <p key={l.id} style={{ fontSize: 12, color: 'var(--rz-primary)' }}>
                [{l.time?.toDate().toLocaleString('ar-SA')}] {l.byEmail}:{' '}
                <b style={{ color: 'var(--rz-gold)' }}>{l.action}</b> - {l.target}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsPage;
