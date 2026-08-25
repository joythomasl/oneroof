import "./App.css";
import { useState } from "react";
import { verificationQueue } from "./data/mockData";
import VerificationCard from "./components/VerificationCard";

function App() {
  const [verifications, setVerifications] =
    useState(verificationQueue);

  const [processingId, setProcessingId] =
    useState(null);

  const [selectedIncident, setSelectedIncident] =
    useState(null);

  const [showRejectModal, setShowRejectModal] =
    useState(false);

  const [toast, setToast] =
    useState(null);

  const [selectedMapIncident, setSelectedMapIncident] =
    useState(null);

  const [activities, setActivities] = useState([
    {
      time: "18:42:51",
      text: "Resolution evidence received",
    },
    {
      time: "18:41:12",
      text: "INC-2051 linked with 3 reports",
    },
    {
      time: "18:39:04",
      text: "POL-03 accepted task INC-2047",
    },
  ]);

  const pendingCount =
    verifications.filter(
      (item) => item.status === "PENDING"
    ).length;

  const closedCount =
    verifications.filter(
      (item) => item.status === "CLOSED"
    ).length;

  const showToast = (message, type) => {
    setToast({
      message,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const addActivity = (text) => {
    const now = new Date();

    const time = now.toLocaleTimeString([], {
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

  const handleApprove = (item) => {
    setProcessingId(item.id);

    setTimeout(() => {
      setVerifications((current) =>
        current.map((verification) =>
          verification.id === item.id
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

  const handleReject = (item) => {
    console.log("REJECT CLICKED:", item.incident.id);

    setSelectedIncident(item);
    setShowRejectModal(true);
  };

  const confirmReject = (reason) => {
    if (!selectedIncident) return;

    const incidentId =
      selectedIncident.incident.id;

    setVerifications((current) =>
      current.map((verification) =>
        verification.id === selectedIncident.id
          ? {
              ...verification,
              status: "REOPENED",
              rejectionReason: reason,
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

  const jumpToVerification = (item) => {
    setSelectedMapIncident(null);

    setTimeout(() => {
      const element = document.getElementById(
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

  return (
    <div className="app">

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
              <strong>CPOC</strong>
              <span>Area Coordinator</span>
            </div>

          </div>

        </div>

      </header>


      <main>

        <section className="area-header">

          <div>

            <div className="eyebrow">
              ACTIVE RESPONSE AREA
            </div>

            <div className="area-title">

              <h2>
                Karippodu
              </h2>

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
                02:47:18
              </strong>
            </div>

            <div>
              <span>
                ACTIVE UNITS
              </span>

              <strong>
                12 / 15
              </strong>
            </div>

            <div>
              <span>
                VERIFICATION
              </span>

              <strong className="warning-text">
                {String(pendingCount).padStart(2, "0")} PENDING
              </strong>
            </div>

          </div>

        </section>


        <section className="status-strip">

          <Stat
            label="P0 · CRITICAL"
            value="02"
            type="critical"
          />

          <Stat
            label="P1 · SERIOUS"
            value="04"
            type="serious"
          />

          <Stat
            label="P2 · ACCESS"
            value="07"
            type="access"
          />

          <Stat
            label="P3 · WELFARE"
            value="03"
            type="welfare"
          />

          <Stat
            label="PENDING VERIFICATION"
            value={String(pendingCount).padStart(2, "0")}
            type="verification"
          />

          <Stat
            label="CLOSED"
            value={String(18 + closedCount).padStart(2, "0")}
            type="closed"
          />

        </section>


        <section className="workspace">

          <div className="map-panel">

            <div className="panel-heading">

              <div>

                <span className="eyebrow">
                  LIVE OPERATIONS
                </span>

                <h3>
                  Area Map
                </h3>

              </div>

              <button className="map-button">
                Area View
              </button>

            </div>


            <div className="map-placeholder">

              <div className="map-grid"></div>

              <div className="map-label label-one">
                KARIPPODU
              </div>

              <div className="map-label label-two">
                NORTH SECTOR
              </div>

              <div className="map-label label-three">
                RIVER ROAD
              </div>


              {verifications.map((item, index) => {

                const status =
                  item.status || "PENDING";

                let markerClass = "pending";
                let markerSymbol = "!";

                if (status === "CLOSED") {
                  markerClass = "closed";
                  markerSymbol = "✓";
                }

                if (status === "REOPENED") {
                  markerClass = "p0";
                  markerSymbol = "!";
                }

                const fallbackPositions = [
                  {
                    top: "31%",
                    left: "32%",
                  },
                  {
                    top: "59%",
                    left: "57%",
                  },
                  {
                    top: "43%",
                    left: "68%",
                  },
                  {
                    top: "66%",
                    left: "35%",
                  },
                  {
                    top: "25%",
                    left: "72%",
                  },
                  {
                    top: "72%",
                    left: "48%",
                  },
                ];

                const position =
                  item.mapPosition ||
                  fallbackPositions[
                    index %
                      fallbackPositions.length
                  ];

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`incident-marker ${markerClass}`}
                    style={{
                      top: position.top,
                      left: position.left,
                    }}
                    title={`${item.incident.id} — ${item.incident.title}`}
                    onClick={() =>
                      setSelectedMapIncident(item)
                    }
                  >
                    {markerSymbol}
                  </button>
                );
              })}


              {selectedMapIncident && (

                <MapIncidentPopup
                  item={selectedMapIncident}
                  onClose={() =>
                    setSelectedMapIncident(null)
                  }
                  onViewQueue={() =>
                    jumpToVerification(
                      selectedMapIncident
                    )
                  }
                />

              )}


              <div className="unit-marker unit-one">
                F
              </div>

              <div className="unit-marker unit-two">
                M
              </div>

              <div className="unit-marker unit-three">
                P
              </div>


              <div className="map-center">

                <span>
                  AREA MAP
                </span>

                <small>
                  Click an incident marker
                </small>

              </div>


              <div className="map-legend">

                <div>
                  <span className="legend-dot critical"></span>
                  Critical incident
                </div>

                <div>
                  <span className="legend-dot pending"></span>
                  Awaiting verification
                </div>

                <div>
                  <span className="legend-dot closed"></span>
                  Closed
                </div>

                <div>
                  <span className="legend-square unit"></span>
                  Agency unit
                </div>

              </div>

            </div>

          </div>


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
                {String(pendingCount).padStart(2, "0")}
              </span>

            </div>


            <div className="queue-summary">

              <span className="status-dot emergency"></span>

              {pendingCount} incidents require verification

            </div>


            <div className="verification-list">

              {verifications
                .filter(
                  (item) =>
                    item.status === "PENDING"
                )
                .map((item) => (

                  <div
                    key={item.id}
                    id={`verification-${item.id}`}
                  >

                    <VerificationCard
                      item={item}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      processing={
                        processingId === item.id
                      }
                    />

                  </div>

                ))}


              {pendingCount === 0 && (

                <div className="queue-clear">

                  <div className="queue-icon">
                    ✓
                  </div>

                  <strong>
                    Verification queue clear
                  </strong>

                  <p>
                    All submitted evidence has been reviewed.
                  </p>

                </div>

              )}

            </div>

          </aside>

        </section>


        <section className="bottom-grid">

          <DashboardPanel
            title="Active Agencies"
            eyebrow="FIELD RESPONSE"
          >

            <Agency
              name="Fire & Rescue"
              units="4 units"
              active="3 active"
            />

            <Agency
              name="Medical Response"
              units="2 units"
              active="2 active"
            />

            <Agency
              name="Police"
              units="3 units"
              active="2 active"
            />

            <Agency
              name="SDRF"
              units="2 units"
              active="2 active"
            />

          </DashboardPanel>


          <DashboardPanel
            title="Linked Reports"
            eyebrow="INCIDENT CLUSTERS"
          >

            <div className="linked-report">

              <strong>
                INC-2047
              </strong>

              <span>
                Road blockage · 3 reports linked
              </span>

            </div>

            <div className="linked-report">

              <strong>
                INC-2051
              </strong>

              <span>
                Flooding · 5 reports linked
              </span>

            </div>

          </DashboardPanel>


          <DashboardPanel
            title="Live Activity"
            eyebrow="EVENT STREAM"
          >

            {activities.map(
              (activity, index) => (

                <Activity
                  key={`${activity.time}-${index}`}
                  time={activity.time}
                  text={activity.text}
                />

              )
            )}

          </DashboardPanel>

        </section>

      </main>


      {showRejectModal &&
        selectedIncident && (

          <RejectModal
            incident={selectedIncident}
            onCancel={() => {
              setShowRejectModal(false);
              setSelectedIncident(null);
            }}
            onConfirm={confirmReject}

          />

        )}


      {toast && (

        <div className={`toast ${toast.type}`}>

          <span>
            {toast.type === "success"
              ? "✓"
              : "⚠"}
          </span>

          {toast.message}

        </div>

      )}

    </div>
  );
}


function Stat({
  label,
  value,
  type,
}) {
  return (
    <div
      className={`stat-card ${type}`}
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}


function Agency({
  name,
  units,
  active,
}) {
  return (
    <div className="agency-row">

      <div className="agency-icon">
        {name.charAt(0)}
      </div>

      <div>

        <strong>
          {name}
        </strong>

        <span>
          {units}
        </span>

      </div>

      <span className="agency-status">

        <span className="status-dot online"></span>

        {active}

      </span>

    </div>
  );
}


function Activity({
  time,
  text,
}) {
  return (
    <div className="activity-row">

      <span>
        {time}
      </span>

      <p>
        {text}
      </p>

    </div>
  );
}


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

          <h3>
            {title}
          </h3>

        </div>

      </div>

      <div className="panel-content">
        {children}
      </div>

    </section>
  );
}


function MapIncidentPopup({
  item,
  onClose,
  onViewQueue,
}) {
  const status =
    item.status || "PENDING";

  const statusLabel =
    status === "CLOSED"
      ? "CLOSED"
      : status === "REOPENED"
      ? "REOPENED"
      : "PENDING VERIFICATION";

  return (
    <div className="map-incident-popup">

      <div className="map-popup-header">

        <div>

          <span className="eyebrow">
            INCIDENT
          </span>

          <strong>
            {item.incident.id}
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
        {item.incident.title}
      </h4>


      <div className="map-popup-meta">

        <span>
          {item.incident.severity}
        </span>

        <span>
          {item.incident.area}
        </span>

        <span>
          {item.incident.source}
        </span>

      </div>


      <div
        className={`map-popup-status ${
          status.toLowerCase()
        }`}
      >

        <span className="status-dot"></span>

        {statusLabel}

      </div>


      {status === "PENDING" && (

        <button
          type="button"
          className="map-popup-action"
          onClick={onViewQueue}
        >
          VIEW IN VERIFICATION QUEUE →
        </button>

      )}

    </div>
  );
}


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

  const [reason, setReason] = useState(
    "Location mismatch"
  );

  return (
    <div className="modal-backdrop">

      <div className="reject-modal">

        {/* HEADER */}

        <div className="modal-header">

          <div>
            <span className="eyebrow">
              VERIFICATION DECISION
            </span>

            <h3>
              Reject {incident.incident.id}?
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


        {/* WARNING */}

        <div className="modal-warning">

          <span className="modal-warning-icon">
            ⚠
          </span>

          <div>
            Rejecting this evidence will reopen
            the incident for further response.
          </div>

        </div>


        {/* REASON */}

        <div className="reason-section">

          <label>
            REJECTION REASON
          </label>

          <div className="reason-list">

            {reasons.map((item) => (

              <button
                key={item}
                type="button"
                className={
                  reason === item
                    ? "reason-option selected"
                    : "reason-option"
                }
                onClick={() => {
                  setReason(item);
                }}
              >

                <span className="radio">
                  {reason === item ? "●" : ""}
                </span>

                <span>
                  {item}
                </span>

              </button>

            ))}

          </div>

        </div>


        {/* ACTIONS */}

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
            onClick={() => {
              console.log(
                "CONFIRM REJECT:",
                incident.incident.id,
                reason
              );

              onConfirm(reason);
            }}
          >
            Reject & Reopen
          </button>

        </div>

      </div>

    </div>
  );
}

export default App;