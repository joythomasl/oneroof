import "./App.css";
import {
  useState,
  useEffect,
  useRef,
} from "react";

import VerificationCard from "./components/VerificationCard";
import Login from "./components/Login";

function App() {
  /* =========================
     TIMER
     ========================= */

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(
        (seconds) => seconds + 1
      );
    }, 1000);

    return () =>
      clearInterval(interval);
  }, []);

  const formatElapsedTime = (
    totalSeconds
  ) => {
    const hours = Math.floor(
      totalSeconds / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const seconds =
      totalSeconds % 60;

    return [
      hours,
      minutes,
      seconds,
    ]
      .map((value) =>
        String(value).padStart(2, "0")
      )
      .join(":");
  };

  /* =========================
     AUTH
     ========================= */

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [currentUser, setCurrentUser] =
    useState(null);

  /* =========================
     VERIFICATIONS
     ========================= */

  const [verifications, setVerifications] =
    useState([]);

  const [processingId, setProcessingId] =
    useState(null);

  const [selectedIncident, setSelectedIncident] =
    useState(null);

  const [showRejectModal, setShowRejectModal] =
    useState(false);

  const [toast, setToast] =
    useState(null);

  /* =========================
     QUEUE
     ========================= */

  const [queueFilter, setQueueFilter] =
    useState("ALL");

  /* =========================
     ACTIVITY
     ========================= */

  const [activities, setActivities] =
    useState([]);

  /* =========================
     COUNTS
     ========================= */

  const activeUnits = new Set(
    verifications
      .map(
        (item) =>
          item.resolution?.unit
      )
      .filter(Boolean)
  );

  const activeUnitCount =
    activeUnits.size;

  const pendingCount =
    verifications.filter(
      (item) =>
        item.status === "PENDING"
    ).length;

  const closedCount =
    verifications.filter(
      (item) =>
        item.status === "CLOSED"
    ).length;

  const reopenedCount =
    verifications.filter(
      (item) =>
        item.status === "REOPENED"
    ).length;

  const allCount =
    verifications.length;

  const filteredVerifications =
    queueFilter === "ALL"
      ? verifications
      : verifications.filter(
          (item) =>
            item.status === queueFilter
        );

  /* =========================
     LOGIN
     ========================= */

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  /* =========================
     TOAST
     ========================= */

  const showToast = (
    message,
    type
  ) => {
    setToast({
      message,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  /* =========================
     ACTIVITY
     ========================= */

  const addActivity = (text) => {
    const now = new Date();

    const time =
      now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

    setActivities((current) => [
      {
        time,
        text,
      },
      ...current,
    ]);
  };

  /* =========================
     APPROVE
     ========================= */

  const handleApprove = (item) => {
    setProcessingId(item.id);

    setTimeout(() => {
      setVerifications(
        (current) =>
          current.map(
            (verification) =>
              verification.id ===
              item.id
                ? {
                    ...verification,
                    status: "CLOSED",
                  }
                : verification
          )
      );

      setProcessingId(null);

      showToast(
        `${item.incident.id} verified and closed`,
        "success"
      );

      addActivity(
        `CPOC approved ${item.incident.id}`
      );
    }, 800);
  };

  /* =========================
     REJECT
     ========================= */

  const handleReject = (item) => {
    setSelectedIncident(item);
    setShowRejectModal(true);
  };

  /* =========================
     CONFIRM REJECT
     ========================= */

  const confirmReject = (reason) => {
    if (!selectedIncident) return;

    const incidentId =
      selectedIncident.incident.id;

    setVerifications(
      (current) =>
        current.map(
          (verification) =>
            verification.id ===
            selectedIncident.id
              ? {
                  ...verification,
                  status: "REOPENED",
                  rejectionReason:
                    reason,
                }
              : verification
        )
    );

    setShowRejectModal(false);
    setSelectedIncident(null);

    showToast(
      `${incidentId} rejected and reopened`,
      "warning"
    );

    addActivity(
      `CPOC rejected ${incidentId} · ${reason}`
    );
  };

  /* =========================
     MAP → QUEUE
     ========================= */

  const jumpToVerification = (item) => {
    setQueueFilter("ALL");

    setTimeout(() => {
      const element =
        document.getElementById(
          `verification-${item.id}`
        );

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        element.classList.add(
          "verification-highlight"
        );

        setTimeout(() => {
          element.classList.remove(
            "verification-highlight"
          );
        }, 1800);
      }
    }, 100);
  };

  /* =========================
     LOGIN SCREEN
     ========================= */

  if (!isAuthenticated) {
    return (
      <Login
        onLogin={handleLogin}
      />
    );
  }

  /* =========================
     DASHBOARD
     ========================= */

  return (
    <div className="app">

      {/* =========================
          HEADER
          ========================= */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-mark">
            U
          </div>

          <div>
            <h1>UNIRES</h1>

            <span>
              CPOC OPERATIONS CONSOLE
            </span>
          </div>

        </div>

        <div className="topbar-right">

          <div className="connection">
            <span className="status-dot online"></span>
            SYSTEM ONLINE
          </div>

          <div className="connection">
            <span className="status-dot online"></span>
            MESH CONNECTED
          </div>

          <div className="cpoc-user">

            <div className="avatar">
              CP
            </div>

            <div>
              <strong>
                {currentUser?.id ||
                  "CPOC"}
              </strong>

              <span>
                {currentUser?.role ||
                  "Area Coordinator"}
              </span>
            </div>

          </div>

        </div>

      </header>

      <main>

        {/* =========================
            AREA HEADER
            ========================= */}

        <section className="area-header">

          <div>

            <div className="eyebrow">
              ACTIVE RESPONSE AREA
            </div>

            <div className="area-title">

              <h2>Karippodu</h2>

              <span className="emergency-badge">

                <span className="status-dot emergency"></span>

                EMERGENCY

              </span>

            </div>

          </div>

          <div className="area-meta">

            <div>
              <span>
                EMERGENCY ACTIVE
              </span>

              <strong>
                {formatElapsedTime(
                  elapsedSeconds
                )}
              </strong>
            </div>

            <div>
              <span>
                ACTIVE UNITS
              </span>

              <strong>
                {activeUnitCount}
              </strong>
            </div>

            <div>
              <span>
                VERIFICATION
              </span>

              <strong className="warning-text">
                {String(
                  pendingCount
                ).padStart(2, "0")}{" "}
                PENDING
              </strong>
            </div>

          </div>

        </section>

        {/* =========================
            STATUS STRIP
            ========================= */}

        <section className="status-strip">

          <Stat
            label="P0 · CRITICAL"
            value={
              verifications.filter(
                (item) =>
                  item.incident
                    ?.severity === "P0"
              ).length
            }
            type="critical"
          />

          <Stat
            label="P1 · SERIOUS"
            value={
              verifications.filter(
                (item) =>
                  item.incident
                    ?.severity === "P1"
              ).length
            }
            type="serious"
          />

          <Stat
            label="P2 · ACCESS"
            value={
              verifications.filter(
                (item) =>
                  item.incident
                    ?.severity === "P2"
              ).length
            }
            type="access"
          />

          <Stat
            label="PENDING VERIFICATION"
            value={String(
              pendingCount
            ).padStart(2, "0")}
            type="verification"
          />

          <Stat
            label="CLOSED"
            value={closedCount}
            type="closed"
          />

        </section>

        {/* =========================
            WORKSPACE
            ========================= */}

        <section className="workspace">

          {/* =========================
              MAP
              ========================= */}

          <div className="map-panel">

            <AreaMap
              incidents={verifications}
              onViewQueue={
                jumpToVerification
              }
            />

          </div>

          {/* =========================
              VERIFICATION QUEUE
              ========================= */}

          <aside className="queue-panel">

            <div className="panel-heading">

              <div>

                <span className="eyebrow">
                  CPOC ACTION REQUIRED
                </span>

                <h3>
                  Verification Queue
                </h3>

              </div>

              <span className="queue-count">
                {String(
                  allCount
                ).padStart(2, "0")}
              </span>

            </div>

            <div className="queue-summary">

              <span className="status-dot emergency"></span>

              {pendingCount} pending ·{" "}
              {closedCount} closed ·{" "}
              {reopenedCount} reopened

            </div>

            {/* FILTERS */}

            <div className="queue-filters">

              <button
                type="button"
                className={
                  queueFilter === "ALL"
                    ? "queue-filter active"
                    : "queue-filter"
                }
                onClick={() =>
                  setQueueFilter("ALL")
                }
              >
                ALL
                <span>
                  {allCount}
                </span>
              </button>

              <button
                type="button"
                className={
                  queueFilter ===
                  "PENDING"
                    ? "queue-filter active"
                    : "queue-filter"
                }
                onClick={() =>
                  setQueueFilter(
                    "PENDING"
                  )
                }
              >
                PENDING
                <span>
                  {pendingCount}
                </span>
              </button>

              <button
                type="button"
                className={
                  queueFilter === "CLOSED"
                    ? "queue-filter active"
                    : "queue-filter"
                }
                onClick={() =>
                  setQueueFilter(
                    "CLOSED"
                  )
                }
              >
                APPROVED
                <span>
                  {closedCount}
                </span>
              </button>

              <button
                type="button"
                className={
                  queueFilter ===
                  "REOPENED"
                    ? "queue-filter active"
                    : "queue-filter"
                }
                onClick={() =>
                  setQueueFilter(
                    "REOPENED"
                  )
                }
              >
                REOPENED
                <span>
                  {reopenedCount}
                </span>
              </button>

            </div>

            {/* QUEUE LIST */}

            <div className="verification-list">

              {filteredVerifications.map(
                (item) => (

                  <div
                    key={item.id}
                    id={`verification-${item.id}`}
                  >

                    <VerificationCard
                      item={item}
                      onApprove={
                        handleApprove
                      }
                      onReject={
                        handleReject
                      }
                      processing={
                        processingId ===
                        item.id
                      }
                      readOnly={
                        item.status !==
                        "PENDING"
                      }
                    />

                  </div>

                )
              )}

              {filteredVerifications.length ===
                0 && (

                <div className="queue-clear">

                  <div className="queue-icon">
                    ✓
                  </div>

                  <strong>
                    No incidents in this
                    filter
                  </strong>

                  <p>
                    Try selecting another
                    verification status.
                  </p>

                </div>

              )}

            </div>

          </aside>

        </section>

        {/* =========================
            BOTTOM PANELS
            ========================= */}

        <section className="bottom-grid">

          <DashboardPanel
            title="Active Agencies"
            eyebrow="FIELD RESPONSE"
          >
            <div className="empty-dashboard-state">
              No agency data available
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Linked Reports"
            eyebrow="INCIDENT CLUSTERS"
          >
            <div className="empty-dashboard-state">
              No linked reports available
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Live Activity"
            eyebrow="EVENT STREAM"
          >
            {activities.length > 0 ? (
              activities.map(
                (activity, index) => (
                  <Activity
                    key={`${activity.time}-${index}`}
                    time={activity.time}
                    text={activity.text}
                  />
                )
              )
            ) : (
              <div className="empty-dashboard-state">
                No activity available
              </div>
            )}
          </DashboardPanel>

        </section>

      </main>

      {/* =========================
          REJECT MODAL
          ========================= */}

      {showRejectModal &&
        selectedIncident && (

          <RejectModal
            incident={
              selectedIncident
            }
            onCancel={() => {
              setShowRejectModal(
                false
              );

              setSelectedIncident(
                null
              );
            }}
            onConfirm={
              confirmReject
            }
          />

        )}

      {/* =========================
          TOAST
          ========================= */}

      {toast && (

        <div
          className={`toast ${toast.type}`}
        >

          <span>
            {toast.type ===
            "success"
              ? "✓"
              : "⚠"}
          </span>

          {toast.message}

        </div>

      )}

    </div>
  );
}


/* =========================================================
   STAT
   ========================================================= */

function Stat({
  label,
  value,
  type,
}) {
  return (
    <div
      className={`stat-card ${type}`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


/* =========================================================
   ACTIVITY
   ========================================================= */

function Activity({
  time,
  text,
}) {
  return (
    <div className="activity-row">
      <span>{time}</span>
      <p>{text}</p>
    </div>
  );
}


/* =========================================================
   DASHBOARD PANEL
   ========================================================= */

function DashboardPanel({
  title,
  eyebrow,
  children,
}) {
  return (
    <section className="bottom-panel">

      <div className="panel-heading">

        <div>

          <span className="eyebrow">
            {eyebrow}
          </span>

          <h3>{title}</h3>

        </div>

      </div>

      <div className="panel-content">
        {children}
      </div>

    </section>
  );
}


/* =========================================================
   AREA MAP
   ========================================================= */

function AreaMap({
  incidents = [],
  onViewQueue,
}) {
  const [zoom, setZoom] =
    useState(1);

  const [position, setPosition] =
    useState({
      x: 0,
      y: 0,
    });

  const [dragging, setDragging] =
    useState(false);

  const [
    selectedMapIncident,
    setSelectedMapIncident,
  ] = useState(null);

  const dragStart = useRef({
    x: 0,
    y: 0,
  });

  const startPosition = useRef({
    x: 0,
    y: 0,
  });

  /* =========================
     ZOOM
     ========================= */

  const clampZoom = (value) =>
    Math.min(
      4,
      Math.max(0.6, value)
    );

  const zoomIn = () => {
    setZoom((value) =>
      clampZoom(
        value + 0.25
      )
    );
  };

  const zoomOut = () => {
    setZoom((value) =>
      clampZoom(
        value - 0.25
      )
    );
  };

  /* =========================
     RESET
     ========================= */

  const resetView = () => {
    setZoom(1);

    setPosition({
      x: 0,
      y: 0,
    });

    setSelectedMapIncident(
      null
    );
  };

  /* =========================
     MOUSE WHEEL
     ========================= */

  const handleWheel = (event) => {
    event.preventDefault();

    const direction =
      event.deltaY < 0
        ? 0.15
        : -0.15;

    setZoom((value) =>
      clampZoom(
        value + direction
      )
    );
  };

  /* =========================
     DRAG START
     ========================= */

  const handlePointerDown = (
    event
  ) => {
    if (event.button !== 0) return;

    /*
      Don't start map dragging when
      clicking a marker or control.
    */

    if (
      event.target.closest(
        ".map-incident-marker"
      ) ||
      event.target.closest(
        ".map-controls"
      )
    ) {
      return;
    }

    setDragging(true);

    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
    };

    startPosition.current = {
      ...position,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  };

  /* =========================
     DRAG MOVE
     ========================= */

  const handlePointerMove = (
    event
  ) => {
    if (!dragging) return;

    const dx =
      event.clientX -
      dragStart.current.x;

    const dy =
      event.clientY -
      dragStart.current.y;

    setPosition({
      x:
        startPosition.current.x +
        dx,

      y:
        startPosition.current.y +
        dy,
    });
  };

  /* =========================
     DRAG END
     ========================= */

  const stopDragging = (
    event
  ) => {
    setDragging(false);

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    } catch {
      // Pointer already released.
    }
  };

  /* =========================
     DOUBLE CLICK
     ========================= */

  const handleDoubleClick = () => {
    zoomIn();
  };

  /* =========================
     FULLSCREEN
     ========================= */

  const handleFullscreen =
    async () => {
      const mapContainer =
        document.querySelector(
          ".area-map-container"
        );

      if (!mapContainer) return;

      try {
        if (
          !document.fullscreenElement
        ) {
          await mapContainer.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (error) {
        console.error(
          "Map fullscreen error:",
          error
        );
      }
    };

  /* =========================
     MARKER POSITION
     ========================= */

  const fallbackPositions = [
    {
      top: "30%",
      left: "32%",
    },
    {
      top: "55%",
      left: "60%",
    },
    {
      top: "42%",
      left: "72%",
    },
    {
      top: "68%",
      left: "38%",
    },
    {
      top: "24%",
      left: "70%",
    },
    {
      top: "72%",
      left: "50%",
    },
  ];

  return (
    <div className="area-map-container">

      {/* =========================
          MAP HEADER
          ========================= */}

      <div className="map-header">

        <div>

          <div className="eyebrow">
            LIVE OPERATIONS
          </div>

          <h2>Area Map</h2>

        </div>

        <button
          type="button"
          className="area-view-button"
          onClick={resetView}
        >
          Area View
        </button>

      </div>

      {/* =========================
          MAP
          ========================= */}

      <div
        className={`area-map ${
          dragging
            ? "is-dragging"
            : ""
        }`}
        onWheel={handleWheel}
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          stopDragging
        }
        onPointerCancel={
          stopDragging
        }
        onDoubleClick={
          handleDoubleClick
        }
      >

        {/* =========================
            MOVABLE MAP WORLD
            ========================= */}

        <div
          className="map-world"
          style={{
            transform: `
              translate(
                ${position.x}px,
                ${position.y}px
              )
              scale(${zoom})
            `,
          }}
        >

          {/* MAP LABELS */}

          <div className="map-label north">
            NORTH SECTOR
          </div>

          <div className="map-label center">
            KARIPPODU
          </div>

          <div className="map-label east">
            RIVER ROAD
          </div>

          {/* =========================
              INCIDENT MARKERS
              ========================= */}

          {incidents.map(
            (item, index) => {

              const severity =
                String(
                  item.incident
                    ?.severity ||
                    "P2"
                ).toUpperCase();

              const status =
                String(
                  item.status ||
                    "PENDING"
                ).toUpperCase();

              let severityClass =
                "severity-low";

              if (
                severity === "P0"
              ) {
                severityClass =
                  "severity-critical";
              } else if (
                severity === "P1"
              ) {
                severityClass =
                  "severity-high";
              } else if (
                severity === "P2"
              ) {
                severityClass =
                  "severity-moderate";
              }

              let statusClass =
                "pending";

              if (
                status === "CLOSED"
              ) {
                statusClass =
                  "approved";
              } else if (
                status === "REOPENED"
              ) {
                statusClass =
                  "reopened";
              }

              const position =
                item.mapPosition ||
                fallbackPositions[
                  index %
                    fallbackPositions.length
                ];

              return (
                <div
                  key={item.id}
                  className="incident-map-item"
                  style={{
                    top:
                      position.top,
                    left:
                      position.left,
                  }}
                >

                  {/* APPROVAL STATUS */}

                  <span
                    className={`map-status-badge ${statusClass}`}
                  >
                    {status === "CLOSED"
                      ? "APPROVED"
                      : status}
                  </span>

                  {/* SEVERITY MARKER */}

                  <button
                    type="button"
                    className={`map-incident-marker ${severityClass}`}
                    onPointerDown={(
                      event
                    ) => {
                      event.stopPropagation();
                    }}
                    onClick={() =>
                      setSelectedMapIncident(
                        item
                      )
                    }
                    title={`${item.incident?.id || item.id} · ${severity}`}
                  >
                    <span>!</span>
                  </button>

                  {/* INCIDENT ID */}

                  <span className="map-incident-id">
                    {item.incident?.id ||
                      item.id}
                  </span>

                </div>
              );
            }
          )}

        </div>

        {/* =========================
            MAP CONTROLS
            ========================= */}

        <div className="map-controls">

          <button
            type="button"
            onClick={zoomIn}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>

          <button
            type="button"
            onClick={zoomOut}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>

          <button
            type="button"
            onClick={resetView}
            aria-label="Reset map view"
            title="Reset map"
          >
            ⟳
          </button>

          <button
            type="button"
            onClick={
              handleFullscreen
            }
            aria-label="Fullscreen map"
            title="Fullscreen map"
          >
            ⛶
          </button>

        </div>

        {/* =========================
            ZOOM LEVEL
            ========================= */}

        <div className="map-zoom-level">
          {Math.round(
            zoom * 100
          )}
          %
        </div>

        {/* =========================
            LEGEND
            ========================= */}

        <div className="map-legend">

          <strong>
            INCIDENT SEVERITY
          </strong>

          <div>
            <span className="legend-dot critical"></span>
            Critical
          </div>

          <div>
            <span className="legend-dot high"></span>
            High
          </div>

          <div>
            <span className="legend-dot moderate"></span>
            Moderate
          </div>

          <div>
            <span className="legend-dot low"></span>
            Low
          </div>

          <hr />

          <strong>
            APPROVAL STATUS
          </strong>

          <div>
            <span className="legend-dot pending"></span>
            Pending
          </div>

          <div>
            <span className="legend-dot approved"></span>
            Approved
          </div>

          <div>
            <span className="legend-dot reopened"></span>
            Reopened
          </div>

        </div>

        {/* =========================
            MAP POPUP
            ========================= */}

        {selectedMapIncident && (
          <MapIncidentPopup
            item={
              selectedMapIncident
            }
            onClose={() =>
              setSelectedMapIncident(
                null
              )
            }
            onViewQueue={() => {
              setSelectedMapIncident(
                null
              );

              if (onViewQueue) {
                onViewQueue(
                  selectedMapIncident
                );
              }
            }}
          />
        )}

      </div>

    </div>
  );
}


/* =========================================================
   MAP INCIDENT POPUP
   ========================================================= */

function MapIncidentPopup({
  item,
  onClose,
  onViewQueue,
}) {
  const status =
    item.status || "PENDING";

  const severity =
    (
      item.incident
        ?.severity || ""
    ).toUpperCase();

  let severityLabel = "LOW";

  if (severity === "P0") {
    severityLabel = "CRITICAL";
  } else if (severity === "P1") {
    severityLabel = "HIGH";
  } else if (severity === "P2") {
    severityLabel = "MODERATE";
  }

  let statusLabel = "PENDING";

  if (status === "CLOSED") {
    statusLabel = "APPROVED";
  } else if (
    status === "REOPENED"
  ) {
    statusLabel = "REOPENED";
  }

  const integrityChecks = [
    item.integrity?.camera,
    item.integrity?.gps,
    item.integrity?.timestamp,
    item.integrity?.device,
    item.integrity?.incidentBinding,
    item.integrity?.signature,
  ];

  const integrityPassed =
    integrityChecks.filter(
      Boolean
    ).length;

  return (
    <div className="map-incident-popup">

      <div className="map-popup-header">

        <div>

          <span className="eyebrow">
            INCIDENT DETAILS
          </span>

          <strong>
            {item.incident?.id ||
              item.id}
          </strong>

        </div>

        <button
          type="button"
          className="map-popup-close"
          onClick={onClose}
        >
          ×
        </button>

      </div>

      <h4>
        {item.incident?.title ||
          "Incident"}
      </h4>

      <div className="map-popup-meta">

        <span>
          {severityLabel}
        </span>

        <span>
          Priority{" "}
          {item.incident?.severity}
        </span>

        <span>
          {item.incident?.area ||
            "Karippodu"}
        </span>

      </div>

      <div
        className={`map-popup-status ${status.toLowerCase()}`}
      >

        <span
          className={`status-dot ${
            status === "CLOSED"
              ? "online"
              : "emergency"
          }`}
        ></span>

        {statusLabel}

      </div>

      <div className="map-popup-section">

        <div className="map-popup-section-title">
          INCIDENT INFORMATION
        </div>

        <div className="map-popup-row">
          <span>Severity</span>

          <strong>
            {severityLabel}
          </strong>
        </div>

        <div className="map-popup-row">
          <span>Priority</span>

          <strong>
            {item.incident
              ?.severity}
          </strong>
        </div>

        <div className="map-popup-row">
          <span>Reported</span>

          <strong>
            {item.incident?.age ||
              "—"}{" "}
            ago
          </strong>
        </div>

        <div className="map-popup-row">
          <span>Reporter</span>

          <strong>
            {item.original
              ?.reporter ||
              "—"}
          </strong>
        </div>

        <div className="map-popup-row">
          <span>Response unit</span>

          <strong>
            {item.resolution
              ?.unit ||
              "—"}
          </strong>
        </div>

        <div className="map-popup-row">
          <span>Responder</span>

          <strong>
            {item.resolution
              ?.responder ||
              "—"}
          </strong>
        </div>

      </div>

      <div className="map-popup-section">

        <div className="map-popup-section-title">
          LOCATION
        </div>

        <div className="map-popup-row">

          <span>
            Incident GPS
          </span>

          <strong>
            {item.original?.latitude !=
            null
              ? item.original.latitude.toFixed(
                  5
                )
              : "—"}
            {", "}
            {item.original?.longitude !=
            null
              ? item.original.longitude.toFixed(
                  5
                )
              : "—"}
          </strong>

        </div>

        <div className="map-popup-row">

          <span>
            Evidence GPS
          </span>

          <strong>
            {item.resolution?.latitude !=
            null
              ? item.resolution.latitude.toFixed(
                  5
                )
              : "—"}
            {", "}
            {item.resolution?.longitude !=
            null
              ? item.resolution.longitude.toFixed(
                  5
                )
              : "—"}
          </strong>

        </div>

        {item.geo && (
          <div
            className={`map-popup-location ${
              item.geo.valid
                ? "valid"
                : "invalid"
            }`}
          >

            <span>
              {item.geo.valid
                ? "✓"
                : "⚠"}
            </span>

            <div>

              <strong>
                {item.geo.valid
                  ? "LOCATION VERIFIED"
                  : "LOCATION MISMATCH"}
              </strong>

              <small>
                {item.geo.distance}m
                from incident ·
                allowed{" "}
                {item.geo.allowed}m
              </small>

            </div>

          </div>
        )}

      </div>

      <div className="map-popup-section">

        <div className="map-popup-section-title">
          EVIDENCE INTEGRITY
        </div>

        <div className="map-popup-integrity">

          <span className="integrity-mini">
            {item.integrity
              ?.camera
              ? "✓"
              : "!"}{" "}
            Camera
          </span>

          <span className="integrity-mini">
            {item.integrity?.gps
              ? "✓"
              : "!"}{" "}
            GPS
          </span>

          <span className="integrity-mini">
            {item.integrity
              ?.timestamp
              ? "✓"
              : "!"}{" "}
            Timestamp
          </span>

          <span className="integrity-mini">
            {item.integrity?.device
              ? "✓"
              : "!"}{" "}
            Device
          </span>

          <span className="integrity-mini">
            {item.integrity
              ?.incidentBinding
              ? "✓"
              : "!"}{" "}
            Binding
          </span>

          <span className="integrity-mini">
            {item.integrity
              ?.signature
              ? "✓"
              : "!"}{" "}
            Signature
          </span>

        </div>

        <div className="map-popup-integrity-summary">
          {integrityPassed}/6 checks
          passed
        </div>

      </div>

      {(status === "PENDING" ||
        status === "REOPENED") && (

        <button
          type="button"
          className="map-popup-action"
          onClick={onViewQueue}
        >
          {status === "PENDING"
            ? "VIEW IN VERIFICATION QUEUE →"
            : "REVIEW REOPENED INCIDENT →"}
        </button>

      )}

    </div>
  );
}


/* =========================================================
   REJECT MODAL
   ========================================================= */

function RejectModal({
  incident,
  onCancel,
  onConfirm,
}) {
  const reasons = [
    "Location mismatch",
    "Incident not actually resolved",
    "Wrong incident",
    "Photo unclear",
    "Invalid evidence",
    "Other",
  ];

  const [reason, setReason] =
    useState(
      "Location mismatch"
    );

  return (
    <div className="modal-backdrop">

      <div className="reject-modal">

        <div className="modal-header">

          <div>

            <span className="eyebrow">
              VERIFICATION DECISION
            </span>

            <h3>
              Reject{" "}
              {incident.incident.id}?
            </h3>

          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
          >
            ×
          </button>

        </div>

        <div className="modal-warning">

          <span className="modal-warning-icon">
            ⚠
          </span>

          <div>
            Rejecting this evidence
            will reopen the incident
            for further response.
          </div>

        </div>

        <div className="reason-section">

          <label>
            REJECTION REASON
          </label>

          <div className="reason-list">

            {reasons.map(
              (item) => (

                <button
                  key={item}
                  type="button"
                  className={
                    reason === item
                      ? "reason-option selected"
                      : "reason-option"
                  }
                  onClick={() =>
                    setReason(item)
                  }
                >

                  <span className="radio">
                    {reason === item
                      ? "●"
                      : ""}
                  </span>

                  <span>
                    {item}
                  </span>

                </button>

              )
            )}

          </div>

        </div>

        <div className="modal-actions">

          <button
            type="button"
            className="modal-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="modal-reject"
            onClick={() =>
              onConfirm(reason)
            }
          >
            Reject & Reopen
          </button>

        </div>

      </div>

    </div>
  );
}


export default App;