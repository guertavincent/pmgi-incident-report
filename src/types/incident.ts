// Firestore server timestamp compatible type
type Timestamp = {
  toDate: () => Date;
  seconds: number;
  nanoseconds: number;
};

export interface Incident {
  id?: string;
  incidentId: string;
  createdAt: Timestamp | null;
  submittedBy: string;
  submittedByEmail: string;

  reporterName: string;
  dateOfIncident: string;
  timeOfIncident: string;
  locationOfIncident: string;
  incidentReportedBy: string;
  phoneNumberOfReporter: string;
  dateReported: string;
  incidentReportedTo: string;
  phoneWhereReported: string;
  dateOfIncidentReported: string;

  incidentType: string;
  descriptionOfIncident: string;
  peopleInvolved: string;
  correctiveActionTaken: string;
  actionToAvoidFuture: string;
  additionalComments: string;

  correctiveActionApprovedBy: string;
  safetyOfficerInCharge: string;
  correctiveActionImplementedOn: string;

  sample1Url?: string;
  sample2Url?: string;
  sample3Url?: string;
  correctiveSignatureUrl?: string;
  safetySignatureUrl?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: Timestamp | null;
}
