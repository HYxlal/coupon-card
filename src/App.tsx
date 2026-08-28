import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import lineDogGif from './assets/line-dog.gif';
import hugImg from './assets/hug.jpg';
import touchImg from './assets/touch.jpg';
import kissImg from './assets/kiss.gif';
import errandImg from './assets/errand.jpg';
import playImg from './assets/play.jpg';
import intimateImg from './assets/intimate.gif';
import rabbitImg from './assets/兔兔.svg';
import turtleImg from './assets/乌龟.svg';
import hamsterImg from './assets/鼠鼠.svg';
import whitedogImg from './assets/小白狗狗.png';
import yellowdogImg from './assets/小黄狗狗.png';
import fish1Img from './assets/鱼鱼.jpeg';
import fish2Img from './assets/fish2.jpeg';
import './index.css';

const SERVER_KEY = 'SCT403508TEFSic7kAfmNpYi22Zxku0ID7';
const MSG_RAW = './messages.json';

const DEFAULT_SERVICES = [
  { id: 'touch', name: '摸摸10分钟', price: 1, img: touchImg, locked: true },
  { id: 'hug', name: '抱抱', price: 1, img: hugImg },
  { id: 'kiss', name: '亲亲', price: 1, img: kissImg },
  { id: 'errand', name: '跑腿服务', price: 1, img: errandImg },
  { id: 'chores', name: '做家务', price: 3, emoji: '🧹' },
  { id: 'play', name: '一起玩', price: 0, img: playImg },
  { id: 'intimate', name: '亲热', price: 0, img: intimateImg },
];

const INITIAL_COUPONS = 60;

interface Service { id: string; name: string; price: number; img?: string; emoji?: string; locked?: boolean; }
interface HistoryItem { type: 'spend' | 'earn'; icon: string; name: string; detail: string; cost: number; time: string; }
interface Message { text: string; time: string; from?: string; }
interface MealRecord { date: string; meal: string; content: string; time: string; }
interface SleepRecord { date: string; time: string; early: boolean; }
interface SelfieRecord { date: string; time: string; }

function nowStr() {
  const n = new Date();
  return `${n.getMonth()+1}/${n.getDate()} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}
function todayStr() { return new Date().toLocaleDateString('zh-CN'); }

function playSound(type: 'redeem' | 'earn' | 'pet') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (type === 'redeem') {
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.1 + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.1 + 0.3);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1); osc.stop(ctx.currentTime + i * 0.1 + 0.3);
      });
    } else if (type === 'earn') {
      [880, 1100].forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.12 + 0.04);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12); osc.stop(ctx.currentTime + i * 0.12 + 0.25);
      });
    } else if (type === 'pet') {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 660;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
    }
  } catch(e) {}
}

function notify(serviceName: string, cost: number, detail: string) {
  if (!SERVER_KEY) return;
  const title = encodeURIComponent(`她兑换了「${serviceName}」`);
  const content = encodeURIComponent(detail
    ? `服务：${detail}\n消耗：${cost} 张摸摸券`
    : `消耗：${cost} 张摸摸券`);
  new Image().src = `https://sctapi.ftqq.com/${SERVER_KEY}.send?title=${title}&desp=${content}`;
}

// ============ 宠物组件 ============
const PETS = [
  { id: 'rabbit', name: '兔兔', img: rabbitImg, feedback: ['兔兔嚼嚼嚼', '兔兔竖起耳朵', '兔兔蹦蹦跳', '兔兔蹭蹭你'] },
  { id: 'turtle', name: '小乌龟', img: turtleImg, feedback: ['龟龟伸个懒腰', '龟龟慢慢爬', '龟龟缩进壳里', '龟龟探出头'] },
  { id: 'hamster', name: '鼠鼠', img: hamsterImg, feedback: ['鼠鼠腮帮鼓鼓', '鼠鼠转圈圈', '鼠鼠钻进木屑', '鼠鼠打个哈欠'] },
  { id: 'whitedog', name: '小白狗狗', img: whitedogImg, feedback: ['狗狗摇尾巴', '狗狗汪了一声', '狗狗趴下撒娇', '狗狗舔舔手'] },
  { id: 'yellowdog', name: '小黄狗狗', img: yellowdogImg, feedback: ['狗狗汪汪叫', '狗狗转圈追尾巴', '狗狗趴下露肚皮', '狗狗蹭蹭腿'] },
  { id: 'fish1', name: '鱼鱼', img: fish1Img, feedback: ['鱼鱼吐泡泡', '鱼鱼摆尾巴', '鱼鱼转圈圈', '鱼鱼瞪大眼睛'] },
  { id: 'fish2', name: "鱼鱼'", img: fish2Img, feedback: ["鱼鱼'吐泡泡", "鱼鱼'摆尾巴", "鱼鱼'躲起来", "鱼鱼'游过来"] },
];

function Pet({ pet }: { pet: typeof PETS[0] }) {
  const [shaking, setShaking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const timeoutRef = useRef<number>(0);

  const handlePet = (e: React.MouseEvent | React.TouchEvent) => {
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
    const fb = pet.feedback[Math.floor(Math.random() * pet.feedback.length)];
    setFeedback(fb);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setFeedback(''), 1500);
    playSound('pet');
  };

  return (
    <div className="relative cursor-pointer select-none pb-5" onClick={handlePet}>
      <img src={pet.img} alt={pet.name} className={`w-12 h-12 mx-auto object-contain transition-transform ${shaking ? 'animate-bounce' : ''}`}
        style={{ animationDuration: '0.4s' }} />
      <div className="text-xs text-center text-muted-foreground mt-1">{pet.name}</div>
      {feedback && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap text-xs text-primary font-medium animate-pulse z-10"
          style={{ marginTop: '-4px' }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

function PetSection() {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="w-8 h-px bg-border" />
        <span className="text-xs text-muted-foreground tracking-widest">🐾 宠物养成</span>
        <div className="w-8 h-px bg-border" />
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-2">
            {PETS.map(pet => <Pet key={pet.id} pet={pet} />)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  const [coupons, setCoupons] = useState(INITIAL_COUPONS);
  const [customServices, setCustomServices] = useState<Service[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(true);
  const [mealRecords, setMealRecords] = useState<MealRecord[]>([]);
  const [mealsGranted, setMealsGranted] = useState(0);
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([]);
  const [selfieRecords, setSelfieRecords] = useState<SelfieRecord[]>([]);
  const [balancePop, setBalancePop] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'redeem' | 'message' | 'meal' | 'addService' | 'selfie' | null>(null);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [redeemPrice, setRedeemPrice] = useState(1);
  const [redeemNote, setRedeemNote] = useState('');
  const [msgText, setMsgText] = useState('');
  const [mealType, setMealType] = useState('早餐');
  const [mealContent, setMealContent] = useState('');
  const [mealTaste, setMealTaste] = useState('');
  const [newIcon, setNewIcon] = useState('🎁');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState(1);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const services = [...DEFAULT_SERVICES, ...customServices];

  useEffect(() => {
    const d = localStorage.getItem('coupon_state');
    if (d) {
      try {
        const parsed = JSON.parse(d);
        setCoupons(parsed.coupons ?? INITIAL_COUPONS);
        setHistory(parsed.history ?? []);
        setCustomServices(parsed.customServices ?? []);
        setMealRecords(parsed.mealRecords ?? []);
        setMealsGranted(parsed.mealsGranted ?? 0);
        setSleepRecords(parsed.sleepRecords ?? []);
        setSelfieRecords(parsed.selfieRecords ?? []);
      } catch(e) {}
    }
    // 从GitHub加载留言
    fetch(MSG_RAW + '?t=' + Date.now())
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMessages(data); })
      .catch(() => {})
      .finally(() => setMsgLoading(false));
  }, []);

  const save = useCallback(() => {
    localStorage.setItem('coupon_state', JSON.stringify({
      coupons, history, customServices, mealRecords, mealsGranted, sleepRecords, selfieRecords
    }));
  }, [coupons, history, customServices, mealRecords, mealsGranted, sleepRecords, selfieRecords]);

  useEffect(() => { save(); }, [save]);

  const popBalance = () => { setBalancePop(true); setTimeout(() => setBalancePop(false), 400); };

  const openRedeem = (s: Service) => {
    setCurrentService(s);
    setRedeemPrice(s.locked ? s.price : s.price);
    setRedeemNote('');
    setModalMode('redeem');
    setModalOpen(true);
  };

  const confirmRedeem = () => {
    if (!currentService) return;
    const cost = currentService.locked ? currentService.price : redeemPrice;
    if (cost <= 0) { toast.error('价格至少1张'); return; }
    if (coupons < cost) { toast.error(`摸摸券不足！需要 ${cost} 张`); return; }
    setCoupons(c => c - cost);
    setHistory(h => [...h, { type: 'spend', icon: currentService.emoji || '🎁', name: currentService.name, detail: redeemNote, cost, time: nowStr() }]);
    setModalOpen(false);
    popBalance();
    playSound('redeem');
    toast.success(`兑换成功！消耗 ${cost} 张摸摸券`);
    notify(currentService.name, cost, redeemNote);
  };

  const openWriteMessage = () => {
    setMsgText('');
    setModalMode('message');
    setModalOpen(true);
  };

  const confirmWriteMessage = () => {
    if (!msgText.trim()) { toast.error('写点什么吧'); return; }
    const text = msgText;
    setModalOpen(false);
    setMsgText('');

    // 通过Server酱发给你
    const title = encodeURIComponent('💌 小猫猫的留言');
    const content = encodeURIComponent(text);
    new Image().src = `https://sctapi.ftqq.com/${SERVER_KEY}.send?title=${title}&desp=${content}`;

    setMessages(m => [...m, { text, time: nowStr(), from: '她' }]);
    toast.success('已发送！他会收到微信通知');
  };

  const openRecordMeal = () => {
    setMealType('早餐');
    setMealContent('');
    setMealTaste('');
    setModalMode('meal');
    setModalOpen(true);
  };

  const confirmRecordMeal = () => {
    if (!mealContent.trim()) { toast.error('填一下吃了什么吧'); return; }
    const record: MealRecord = { date: todayStr(), meal: mealType, content: mealTaste ? `${mealContent}，${mealTaste}` : mealContent, time: nowStr() };
    const newRecords = [...mealRecords, record];
    setMealRecords(newRecords);
    const totalMeals = newRecords.length;
    const newEarned = Math.floor(totalMeals / 3) - mealsGranted;
    if (newEarned > 0) {
      setCoupons(c => c + newEarned);
      setMealsGranted(g => g + newEarned);
      setHistory(h => [...h, { type: 'earn', icon: '🍽️', name: '猫饭奖励', detail: `累计 ${totalMeals} 餐`, cost: newEarned, time: nowStr() }]);
      playSound('earn');
      toast.success(`🎉 猫饭达标！获得 ${newEarned} 张摸摸券`);
    } else {
      toast(`已记录！还差 ${3 - (totalMeals % 3)} 餐得券`);
    }
    setModalOpen(false);
    popBalance();
  };

  const openSleepCheck = () => {
    const today = todayStr();
    if (sleepRecords.find(r => r.date === today)) { toast('今天已经打过卡啦'); return; }
    const now = new Date();
    const hour = now.getHours(), min = now.getMinutes();
    const isEarly = (hour >= 20) || (hour < 2) || (hour === 2 && min <= 30);
    const record: SleepRecord = { date: today, time: nowStr(), early: isEarly };
    setSleepRecords(s => [...s, record]);
    if (isEarly) {
      setCoupons(c => c + 1);
      setHistory(h => [...h, { type: 'earn', icon: '💤', name: '早睡打卡', detail: '凌晨2:30前睡', cost: 1, time: nowStr() }]);
      playSound('earn');
      toast.success('💤 早睡成功！获得 1 张摸摸券');
    } else {
      toast('打卡了，但超过2:30了，明天早点睡哦~');
    }
    popBalance();
  };

  const openSelfieCheck = () => {
    const today = todayStr();
    if (selfieRecords.find(r => r.date === today)) { toast('今天已经发过啦'); return; }
    setSelfiePreview(null);
    setModalMode('selfie');
    setModalOpen(true);
  };

  const confirmSelfie = () => {
    const today = todayStr();
    setSelfieRecords(s => [...s, { date: today, time: nowStr() }]);
    setCoupons(c => c + 1);
    setHistory(h => [...h, { type: 'earn', icon: '📸', name: '自拍奖励', detail: '发了一张自拍', cost: 1, time: nowStr() }]);
    playSound('earn');
    toast.success('📸 自拍成功！获得 1 张摸摸券');
    setModalOpen(false);
    popBalance();
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const maxW = 200;
        c.width = maxW;
        c.height = (img.height / img.width) * maxW;
        const t = c.getContext('2d');
        t?.drawImage(img, 0, 0, c.width, c.height);
        setSelfiePreview(c.toDataURL('image/jpeg', 0.6));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const openAddService = () => {
    setNewIcon('🎁');
    setNewName('');
    setNewPrice(1);
    setModalMode('addService');
    setModalOpen(true);
  };

  const confirmAddService = () => {
    if (!newName.trim()) { toast.error('请填写服务名称'); return; }
    setCustomServices(s => [...s, { id: 'custom_' + Date.now(), name: newName, emoji: newIcon || '🎁', price: newPrice }]);
    setModalOpen(false);
    toast.success(`已添加「${newName}」`);
  };

  const adjustCoupons = (dir: number) => {
    const n = parseInt(prompt(dir > 0 ? '发几张？' : '减几张？', '5') || '0');
    if (n > 0) {
      setCoupons(c => Math.max(0, c + n * dir));
      toast(dir > 0 ? `已发放 ${n} 张` : `已减少 ${n} 张`);
    }
  };

  const resetAll = () => {
    if (confirm('确定要重置所有数据吗？')) {
      setCoupons(INITIAL_COUPONS);
      setHistory([]);
      setCustomServices([]);
      setMessages([]);
      setMealRecords([]);
      setMealsGranted(0);
      setSleepRecords([]);
      setSelfieRecords([]);
      toast('已重置');
    }
  };

  const today = todayStr();
  const todayMeals = mealRecords.filter(r => r.date === today);
  const todaySleep = sleepRecords.find(r => r.date === today);
  const todaySelfie = selfieRecords.find(r => r.date === today);
  const totalMeals = mealRecords.length;
  const cycleProgress = totalMeals % 3;
  const needMore = 3 - cycleProgress;

  return (
    <div className="min-h-screen bg-[#f9f6f1]">
      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold tracking-widest text-foreground">🐱 小猫猫的摸摸券银行</h1>
          <img src={lineDogGif} alt="线条小狗" className="w-20 h-20 mx-auto" />
        </div>

        {/* Balance */}
        <div className="text-center py-6">
          <div className={`text-7xl font-bold text-primary transition-transform ${balancePop ? 'animate-pulse' : ''}`}>
            {coupons}
          </div>
          <div className="text-sm text-muted-foreground tracking-wider mt-1">张 摸 摸 券</div>
        </div>

        {/* Admin bar */}
        <div className="flex justify-center gap-2 mb-7 flex-wrap">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => adjustCoupons(1)}>+ 发券</Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => adjustCoupons(-1)}>- 减券</Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={openWriteMessage}>✎ 回复</Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={resetAll}>重置</Button>
        </div>

        {/* Messages */}
        <Section title="💌 留言板">
          {msgLoading ? (
            <Card><CardContent className="py-4 text-center text-muted-foreground text-sm">加载中...</CardContent></Card>
          ) : messages.length === 0 ? (
            <Card><CardContent className="py-4 text-center text-muted-foreground text-sm">还没有留言，等待他的小纸条~</CardContent></Card>
          ) : (
            messages.slice().reverse().slice(0, 10).map((m, i) => (
              <Card key={i} className={`mb-2 ${m.from === '她' ? 'border-r-4 border-r-primary' : 'border-l-4 border-l-primary'}`}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary">{m.from === '她' ? '🐱 小猫猫' : '不长'}</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  <p className="text-xs text-muted-foreground mt-2">{m.time}</p>
                </CardContent>
              </Card>
            ))
          )}
        </Section>

        {/* Tasks */}
        <Section title="🎯 每日任务">
          <Card className="mb-2">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="text-2xl">🍽️</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">猫饭记录</div>
                <div className="text-xs text-muted-foreground">记录今天吃了什么 · 每3餐得1张券 · 今日{todayMeals.length}餐</div>
                <Progress value={(cycleProgress / 3) * 100} className="h-1 mt-1" />
              </div>
              {needMore === 0 ? <Badge variant="secondary">✓</Badge> : null}
              <Button size="sm" onClick={openRecordMeal}>记一笔</Button>
            </CardContent>
          </Card>
          <Card className="mb-2">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="text-2xl">💤</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">早睡打卡</div>
                <div className="text-xs text-muted-foreground">凌晨2:30前睡觉都算 · 每天1张券</div>
              </div>
              {todaySleep ? <Badge variant="secondary">✓</Badge> : null}
              <Button size="sm" onClick={openSleepCheck} disabled={!!todaySleep}>{todaySleep ? '已打卡' : '打卡'}</Button>
            </CardContent>
          </Card>
          <Card className="mb-2">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="text-2xl">📸</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">发自拍</div>
                <div className="text-xs text-muted-foreground">发一张自拍 · 每天1张券</div>
              </div>
              {todaySelfie ? <Badge variant="secondary">✓</Badge> : null}
              <Button size="sm" onClick={openSelfieCheck} disabled={!!todaySelfie}>{todaySelfie ? '已打卡' : '打卡'}</Button>
            </CardContent>
          </Card>
        </Section>

        {/* Pet section */}
        <PetSection />

        {/* Service cards */}
        <Section title="🛒 兑换服务">
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            {services.map(s => (
              <Card key={s.id} className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border-2 border-transparent hover:border-primary/30" onClick={() => openRedeem(s)}>
                <CardContent className="p-4 text-center">
                  <div className="mb-2 flex justify-center">
                    {s.img ? <img src={s.img} alt={s.name} className="w-10 h-10 object-contain" /> : <span className="text-3xl">{s.emoji}</span>}
                  </div>
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-primary font-medium mt-1">
                    <span className="text-base font-bold">{s.price}</span> 张
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border-dashed border-muted-foreground/30 opacity-70 hover:opacity-100" onClick={openAddService}>
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">➕</div>
                <div className="font-semibold text-sm">添加服务</div>
                <div className="text-xs text-muted-foreground mt-1">自定义</div>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* History */}
        <Section title="📋 记录">
          {history.length === 0 ? (
            <Card><CardContent className="py-4 text-center text-muted-foreground text-sm">还没有记录</CardContent></Card>
          ) : (
            history.slice().reverse().map((h, i) => (
              <Card key={i} className="mb-2">
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-xl">{h.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{h.name}{h.detail ? ` · ${h.detail}` : ''}</div>
                    <div className="text-xs text-muted-foreground">{h.time}</div>
                  </div>
                  <div className={`font-bold text-sm ${h.type === 'earn' ? 'text-green-600' : 'text-primary'}`}>
                    {h.type === 'earn' ? '+' : '-'}{h.cost}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </Section>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {modalMode === 'redeem' && currentService && <>{currentService.img ? <img src={currentService.img} alt={currentService.name} className="w-12 h-12 object-contain mx-auto mb-2" /> : <span className="text-4xl block mb-2">{currentService.emoji}</span>}{currentService.name}</>}
              {modalMode === 'message' && <><span className="text-4xl block mb-2">💌</span>想对不长说的话</>}
              {modalMode === 'meal' && <><span className="text-4xl block mb-2">🍽️</span>猫饭记录</>}
              {modalMode === 'addService' && <><span className="text-4xl block mb-2">➕</span>添加服务</>}
              {modalMode === 'selfie' && <><span className="text-4xl block mb-2">📸</span>发自拍</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {modalMode === 'redeem' && currentService && (
              <>
                {currentService.locked ? (
                  <div className="text-center text-sm text-muted-foreground">固定 {currentService.price} 张</div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Label className="shrink-0">价格：</Label>
                    <Input type="number" value={redeemPrice} onChange={e => setRedeemPrice(parseInt(e.target.value) || 0)} min={0} max={coupons} className="w-20" />
                    <span className="text-sm text-muted-foreground">张</span>
                  </div>
                )}
                <Label>备注（可选）</Label>
                <Input value={redeemNote} onChange={e => setRedeemNote(e.target.value)} placeholder="比如：帮我按摩肩膀" />
              </>
            )}
            {modalMode === 'message' && (
              <>
                <Label>想对不长说的话</Label>
                <Textarea value={msgText} onChange={e => setMsgText(e.target.value)} rows={3} placeholder="想对不长说什么..." />
              </>
            )}
            {modalMode === 'meal' && (
              <>
                <Label>哪一餐</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['早餐','午餐','晚餐','下午茶','夜宵','零食'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Label>吃了什么</Label>
                <Input value={mealContent} onChange={e => setMealContent(e.target.value)} placeholder="比如：吃了面包和牛奶" />
                <Label>好不好吃</Label>
                <Input value={mealTaste} onChange={e => setMealTaste(e.target.value)} placeholder="好吃！/ 一般般 / 不太行" />
              </>
            )}
            {modalMode === 'addService' && (
              <>
                <Label>图标（emoji）</Label>
                <Input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="选一个emoji" />
                <Label>服务名称</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="比如：帮我按摩" />
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">默认价格：</Label>
                  <Input type="number" value={newPrice} onChange={e => setNewPrice(parseInt(e.target.value) || 1)} min={1} className="w-20" />
                  <span className="text-sm text-muted-foreground">张</span>
                </div>
              </>
            )}
            {modalMode === 'selfie' && (
              <div className="text-center space-y-3">
                <Label>选择一张自拍照片</Label>
                <Input type="file" accept="image/*" capture="environment" onChange={handleSelfieUpload} />
                {selfiePreview && (
                  <div className="mt-2">
                    <img src={selfiePreview} alt="预览" className="max-w-full rounded-md mx-auto" style={{ maxHeight: '200px' }} />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">图片仅本地预览，不会上传到服务器</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>取消</Button>
            <Button className="flex-1" onClick={() => {
              if (modalMode === 'redeem') confirmRedeem();
              else if (modalMode === 'message') confirmWriteMessage();
              else if (modalMode === 'meal') confirmRecordMeal();
              else if (modalMode === 'addService') confirmAddService();
              else if (modalMode === 'selfie') confirmSelfie();
            }}>确认</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="w-8 h-px bg-border" />
        <span className="text-xs text-muted-foreground tracking-widest">{title}</span>
        <div className="w-8 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}

export default App;