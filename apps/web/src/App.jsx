import { useEffect, useMemo, useState } from "react";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

const emptyRegister = {
  displayName: "",
  email: "",
  password: ""
};

const emptyLogin = {
  email: "demo@example.com",
  password: "password123"
};

const emptyApplication = {
  fullName: "",
  passportName: "",
  accommodationAddress: "",
  notes: ""
};

const paymentChannels = [
  { id: "wechat", label: "微信服务费协助" },
  { id: "alipay", label: "支付宝服务费协助" }
];

const officialMembershipUrl = "https://secure.plusmember.jp/yorushika/1/regist/";

export default function App() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [account, setAccount] = useState(null);
  const [applicationForm, setApplicationForm] = useState(emptyApplication);
  const [applicationResult, setApplicationResult] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [portal, setPortal] = useState(null);
  const [dashboard, setDashboard] = useState({ metrics: {}, latestApplications: [], storeTasks: [] });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${apiBase}/api/events`)
      .then((response) => response.json())
      .then((data) => {
        setEvents(data.events ?? []);
        setSelectedEventId(data.events?.[0]?.id ?? "");
      });

    fetch(`${apiBase}/api/dashboard`)
      .then((response) => response.json())
      .then(setDashboard);
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;

    fetch(`${apiBase}/api/events/${selectedEventId}`)
      .then((response) => response.json())
      .then(setSelectedEvent);
  }, [selectedEventId]);

  const needsMembership = useMemo(
    () => selectedEvent?.salesStatus?.includes("会员") ?? false,
    [selectedEvent]
  );

  function updateForm(setter, field) {
    return (event) => setter((current) => ({ ...current, [field]: event.target.value }));
  }

  function refreshPortal(email) {
    fetch(`${apiBase}/api/portal/${encodeURIComponent(email)}`)
      .then((response) => response.json())
      .then(setPortal);
  }

  function refreshDashboard() {
    fetch(`${apiBase}/api/dashboard`)
      .then((response) => response.json())
      .then(setDashboard);
  }

  function handleRegister(event) {
    event.preventDefault();

    fetch(`${apiBase}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerForm)
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "注册失败");
        return data;
      })
      .then((data) => {
        setAccount(data.user);
        setLoginForm({ email: data.user.email, password: registerForm.password });
        setMessage(data.message);
        refreshPortal(data.user.email);
      })
      .catch((error) => setMessage(error.message));
  }

  function handleLogin(event) {
    event.preventDefault();

    fetch(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginForm)
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "登录失败");
        return data;
      })
      .then((data) => {
        setAccount(data.user);
        setMessage("已进入你的票务协同中心。");
        refreshPortal(data.user.email);
      })
      .catch((error) => setMessage(error.message));
  }

  function handleApplicationSubmit(event) {
    event.preventDefault();
    if (!account || !selectedEvent) return;

    fetch(`${apiBase}/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountEmail: account.email,
        eventId: selectedEvent.id,
        eventDate: selectedEvent.date,
        ...applicationForm
      })
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "提交失败");
        return data;
      })
      .then((data) => {
        setApplicationResult(data);
        setMessage("申请已经提交到票务协同队列。");
        refreshPortal(account.email);
        refreshDashboard();
      })
      .catch((error) => setMessage(error.message));
  }

  function handlePayment(channel) {
    const latestApplicationId =
      portal?.applications?.[0]?.id ??
      `MEMBERSHIP-${account?.id ?? "guest"}-${selectedEvent?.id ?? "unknown"}`;

    fetch(`${apiBase}/api/payments/service-fee`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: latestApplicationId,
        channel,
        amountCny: needsMembership ? 299 : 199
      })
    })
      .then((response) => response.json())
      .then((data) => {
        setPaymentResult(data);
        setMessage("已创建人民币支付协助单，运营侧可继续衔接便利店付款任务。");
        if (account) {
          refreshPortal(account.email);
        }
        refreshDashboard();
      });
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Ticketing Collaboration Flow</p>
          <h1>票务协同，一条流程走完</h1>
          <p className="muted">
            从本站注册、选场次、跳转官方会员、提交资料，到人民币协同付款与中签状态回传，全部围绕一个账号完成。
          </p>
        </div>
        <div className="hero-card summary-card">
          <p className="section-kicker">我们做什么</p>
          <h2>票务协同</h2>
          <ul className="danger-list">
            <li>整理官方流程并给出阶段判断</li>
            <li>引导用户去官方注册会员与完成实名步骤</li>
            <li>管理服务费与便利店付款协同任务</li>
            <li>把申请与中签状态回到本站账号中展示</li>
          </ul>
        </div>
      </header>

      {message && (
        <section className="panel">
          <p className="status good">{message}</p>
        </section>
      )}

      <main className="flow-grid">
        <section className="panel panel-step">
          <div className="step-head">
            <span className="step-index">1</span>
            <div>
              <p className="section-kicker">注册本站账号</p>
              <h2>先进入你的协同中心</h2>
            </div>
          </div>
          {!account ? (
            <div className="split-panel">
              <form className="form-stack" onSubmit={handleRegister}>
                <TextField
                  label="昵称"
                  value={registerForm.displayName}
                  onChange={updateForm(setRegisterForm, "displayName")}
                  placeholder="例如：小鹿歌单研究员"
                />
                <TextField
                  label="邮箱"
                  value={registerForm.email}
                  onChange={updateForm(setRegisterForm, "email")}
                  placeholder="name@example.com"
                />
                <TextField
                  label="密码"
                  value={registerForm.password}
                  onChange={updateForm(setRegisterForm, "password")}
                  placeholder="至少 6 位"
                  type="password"
                />
                <button type="submit" className="primary-link button-reset">
                  注册本站账号
                </button>
              </form>

              <form className="form-stack" onSubmit={handleLogin}>
                <TextField
                  label="邮箱"
                  value={loginForm.email}
                  onChange={updateForm(setLoginForm, "email")}
                  placeholder="name@example.com"
                />
                <TextField
                  label="密码"
                  value={loginForm.password}
                  onChange={updateForm(setLoginForm, "password")}
                  placeholder="请输入密码"
                  type="password"
                />
                <button type="submit" className="ghost-link button-reset">
                  登录已有账号
                </button>
              </form>
            </div>
          ) : (
            <div className="result-box">
              <p className="status good">当前账号：{account.displayName}</p>
              <p className="muted">{account.email}</p>
            </div>
          )}
        </section>

        <section className="panel panel-step">
          <div className="step-head">
            <span className="step-index">2</span>
            <div>
              <p className="section-kicker">选择目标场次</p>
              <h2>确定你的申请目标</h2>
            </div>
          </div>
          <div className="event-list">
            {events.map((event) => (
              <button
                key={event.id}
                type="button"
                className={selectedEventId === event.id ? "event-card active" : "event-card"}
                onClick={() => setSelectedEventId(event.id)}
              >
                <p className="event-date">{event.date}</p>
                <h3>{event.city}</h3>
                <p>{event.venue}</p>
                <span className="pill">{event.salesStatus}</span>
              </button>
            ))}
          </div>
          {selectedEvent && (
            <div className="detail-grid">
              <InfoItem label="票价" value={`JPY ${selectedEvent.ticketPriceJpy}`} />
              <InfoItem label="开演" value={`${selectedEvent.date} ${selectedEvent.startsAt}`} />
              <InfoItem label="支付节点" value={selectedEvent.paymentMethod} />
              <InfoItem label="会员要求" value={needsMembership ? "当前阶段建议会员" : "当前可先观察公开先行"} />
            </div>
          )}
        </section>

        <section className="panel panel-step">
          <div className="step-head">
            <span className="step-index">3</span>
            <div>
              <p className="section-kicker">官方会员引导</p>
              <h2>跳转注册夜鹿会员</h2>
            </div>
          </div>
          <p className="muted">
            会员注册必须在官方页面完成。系统只根据当前申请阶段提示你是否需要会员，并可以创建人民币会费协助单。
          </p>
          <div className="result-box">
            <p className="status">{needsMembership ? "当前场次阶段：建议先完成会员" : "当前场次阶段：会员可选"}</p>
            <p className="muted">
              {needsMembership
                ? "该场次当前仍以会员先行逻辑为主，建议先去官方完成会员注册，再回本站继续。"
                : "该场次目前可以先继续资料准备，是否购买会员取决于后续官方阶段变化。"}
            </p>
            <ul className="danger-list">
              <li>夜鹿会员注册需要在手机浏览器中完成。</li>
              <li>后续电子票会显示在 Yorushika 官方 App 中。</li>
              <li>申请前请先确认你的手机可以安装并使用官方 App。</li>
            </ul>
            <div className="hero-actions">
              <a href={officialMembershipUrl} target="_blank" rel="noreferrer" className="primary-link">
                手机端前往官方注册会员
              </a>
              <button
                type="button"
                className="ghost-link"
                onClick={() => handlePayment("alipay")}
                disabled={!account}
              >
                创建人民币会费协助单
              </button>
            </div>
          </div>
        </section>

        <section className="panel panel-step">
          <div className="step-head">
            <span className="step-index">4</span>
            <div>
              <p className="section-kicker">登录会员后提交申请</p>
              <h2>填资料，进入票务协同</h2>
            </div>
          </div>
          <form className="form-stack" onSubmit={handleApplicationSubmit}>
            <TextField
              label="中文姓名"
              value={applicationForm.fullName}
              onChange={updateForm(setApplicationForm, "fullName")}
              placeholder="例如：张三"
            />
            <TextField
              label="护照姓名"
              value={applicationForm.passportName}
              onChange={updateForm(setApplicationForm, "passportName")}
              placeholder="例如：ZHANG SAN"
            />
            <TextField
              label="真实住宿地址"
              value={applicationForm.accommodationAddress}
              onChange={updateForm(setApplicationForm, "accommodationAddress")}
              placeholder="请填写真实酒店或真实入住地址"
            />
            <label className="field">
              <span>补充说明</span>
              <textarea
                rows="4"
                value={applicationForm.notes}
                onChange={updateForm(setApplicationForm, "notes")}
                placeholder="例如：已注册会员，想走大阪公开先行，希望协同提醒店付截止时间。"
              />
            </label>
            <button type="submit" className="primary-link button-reset" disabled={!account || !selectedEvent}>
              提交票务协同申请
            </button>
          </form>
          {applicationResult && (
            <div className="result-box">
              <p className="status good">申请单已创建：{applicationResult.id}</p>
              <p className="muted">下一步会进入客服审核与付款节点判断。</p>
            </div>
          )}
        </section>

        <section className="panel panel-step">
          <div className="step-head">
            <span className="step-index">5</span>
            <div>
              <p className="section-kicker">人民币支付协同</p>
              <h2>服务费与便利店付款协同</h2>
            </div>
          </div>
          <p className="muted">
            官方票款能否由工作人员协助便利店付款，取决于官方允许的场景。本站只负责创建协同任务、记录授权和回执。
          </p>
          <div className="hero-actions">
            {paymentChannels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                className={channel.id === "wechat" ? "primary-link" : "ghost-link"}
                onClick={() => handlePayment(channel.id)}
                disabled={!account}
              >
                {channel.label}
              </button>
            ))}
          </div>
          {paymentResult && (
            <div className="result-box">
              <p className="status good">已创建支付协助单：{paymentResult.paymentId}</p>
              <p className="muted">{paymentResult.note}</p>
              <a href={paymentResult.qrCodeUrl} target="_blank" rel="noreferrer">
                查看支付占位链接
              </a>
            </div>
          )}
        </section>

        <section className="panel panel-step panel-wide">
          <div className="step-head">
            <span className="step-index">6</span>
            <div>
              <p className="section-kicker">个人中心</p>
              <h2>回看自己的申请和中签状态</h2>
            </div>
          </div>
          {portal ? (
            <div className="portal-grid">
              <div className="result-box">
                <p className="source-name">{portal.user.displayName}</p>
                <p className="muted">{portal.user.email}</p>
                <div className="flow-list">
                  {portal.flow.map((step) => (
                    <div key={step.title} className="flow-item">
                      <span>{step.title}</span>
                      <strong>{step.status}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="result-box">
                <p className="source-name">我的申请</p>
                {portal.applications.length === 0 ? (
                  <p className="muted">还没有申请单，先完成上面的流程。</p>
                ) : (
                  <div className="task-list">
                    {portal.applications.map((item) => (
                      <div key={item.id} className="task-card">
                        <p className="source-name">{item.id}</p>
                        <p>场次：{item.eventDate}</p>
                        <p>会员阶段：{item.membershipStatus}</p>
                        <p>协同阶段：{item.collaborationStage}</p>
                        <span className="pill">中签状态：{item.lotteryStatus}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="result-box">
                <p className="source-name">系统提示</p>
                <ul className="danger-list">
                  {portal.notices.map((notice) => (
                    <li key={notice}>{notice}</li>
                  ))}
                  <li>夜鹿会员注册页为手机端站点，建议直接用手机浏览器打开。</li>
                  <li>电子票最终展示位置为 Yorushika 官方 App，而不是本站。</li>
                </ul>
              </div>
            </div>
          ) : (
            <p className="muted">登录或注册后，这里会显示你的完整流程和中签状态。</p>
          )}
        </section>

        <section className="panel panel-wide">
          <div className="section-head">
            <p className="section-kicker">运营视角</p>
            <h2>当前协同池</h2>
          </div>
          <div className="metric-grid">
            <MetricCard label="待审核申请" value={String(dashboard.metrics.pendingApplications ?? 0)} />
            <MetricCard label="待店付任务" value={String(dashboard.metrics.pendingStoreTasks ?? 0)} />
            <MetricCard label="待付款回执" value={String(dashboard.metrics.waitingPaymentProof ?? 0)} />
          </div>
          <div className="split-panel compact">
            <div className="task-list">
              {dashboard.latestApplications?.map((application) => (
                <div key={application.id} className="task-card">
                  <p className="source-name">{application.fullName}</p>
                  <p>{application.id}</p>
                  <span className="pill">{application.status}</span>
                </div>
              ))}
            </div>
            <div className="task-list">
              {dashboard.storeTasks?.map((task) => (
                <div key={task.id} className="task-card">
                  <p className="source-name">{task.id}</p>
                  <p>{task.city}</p>
                  <p className="muted">{task.dueAt}</p>
                  <span className="pill">{task.status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
