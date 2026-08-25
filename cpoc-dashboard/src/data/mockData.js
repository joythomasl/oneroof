export const verificationQueue = [
  {
    id: "VQ-001",

    incident: {
      id: "INC-2047",
      title: "Road blockage",
      severity: "P1",
      area: "Karippodu",
      source: "FIRE-07",
      age: "04m"
    },

    original: {
      image: null,
      latitude: 10.12482,
      longitude: 76.30211,
      capturedAt: "18:34:12",
      reporter: "Civilian report"
    },

    resolution: {
      image: null,
      latitude: 10.12521,
      longitude: 76.30273,
      capturedAt: "18:42:51",
      responder: "Arun Kumar",
      unit: "FIRE-07"
    },

    geo: {
      distance: 58,
      allowed: 50,
      valid: false
    },

    integrity: {
      camera: true,
      gps: true,
      timestamp: true,
      device: true,
      incidentBinding: true,
      signature: true
    },

    status: "PENDING",

    mapPosition: {
      top: "31%",
      left: "32%"
    }
  },

  {
    id: "VQ-002",

    incident: {
      id: "INC-2051",
      title: "Flooded road",
      severity: "P1",
      area: "Karippodu",
      source: "MED-02",
      age: "07m"
    },

    original: {
      image: null,
      latitude: 10.12842,
      longitude: 76.30521,
      capturedAt: "18:31:22",
      reporter: "Police report"
    },

    resolution: {
      image: null,
      latitude: 10.12848,
      longitude: 76.30526,
      capturedAt: "18:39:41",
      responder: "Meera Nair",
      unit: "MED-02"
    },

    geo: {
      distance: 9,
      allowed: 50,
      valid: true
    },

    integrity: {
      camera: true,
      gps: true,
      timestamp: true,
      device: true,
      incidentBinding: true,
      signature: true
    },

    status: "PENDING",

    mapPosition: {
      top: "58%",
      left: "57%"
    }
  },

  {
    id: "VQ-003",

    incident: {
      id: "INC-2055",
      title: "Collapsed power line",
      severity: "P2",
      area: "Karippodu",
      source: "POL-03",
      age: "11m"
    },

    original: {
      image: "/evidence/original.avif",
      latitude: 10.12112,
      longitude: 76.30882,
      capturedAt: "18:27:04",
      reporter: "Police report"
    },

    resolution: {
      image: "/evidence/resolution.avif",
      latitude: 10.12115,
      longitude: 76.30885,
      capturedAt: "18:35:28",
      responder: "Vishnu Raj",
      unit: "POL-03"
    },

    geo: {
      distance: 5,
      allowed: 50,
      valid: true
    },

    integrity: {
      camera: true,
      gps: true,
      timestamp: true,
      device: true,
      incidentBinding: true,
      signature: true
    },

    status: "PENDING",

    mapPosition: {
      top: "43%",
      left: "68%"
    }
  }
];