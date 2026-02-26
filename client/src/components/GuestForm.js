import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUser, FaWifi } from "react-icons/fa";
import { useMsal } from "@azure/msal-react";
import axios from "axios";
import Swal from "sweetalert2";
import { validatePhoneLength } from "../utils/phoneUtils";
import duplicateIcon from "../images/duplicate.png";

export default function GuestForm({ isMobile, setActiveForm, guestToEdit }) {
  const { accounts } = useMsal();

  const currentAccount = accounts[0];

  const ssoHostName =
    currentAccount?.name ||
    currentAccount?.username ||
    currentAccount?.idTokenClaims?.preferred_username ||
    currentAccount?.idTokenClaims?.email ||
    "Unknown User";

  // Email can still be used for submittedBy
  const ssoEmail =
    currentAccount?.idTokenClaims?.preferred_username ||
    currentAccount?.username ||
    currentAccount?.idTokenClaims?.email ||
    "Unknown User";

  const COUNTRY_CODES = [
    { code: "+91", label: "India (+91)" },
    { code: "+81", label: "Japan (+81)" },
    { code: "+971", label: "UAE (+971)" },
    { code: "+65", label: "Singapore (+65)" },
    { code: "+66", label: "Thailand (+66)" },
    { code: "+86", label: "China (+86)" },
    { code: "+27", label: "South Africa (+27)" },
    { code: "+1", label: "USA (+1)" },
    { code: "+44", label: "UK (+44)" },
    { code: "+49", label: "Germany (+49)" },
    { code: "+33", label: "France (+33)" },
    { code: "+61", label: "Australia (+61)" },
  ];

  const emptyGuest = {
    category: "Isuzu Employee",
    firstName: "",
    lastName: "",
    email: "",
    company: "",

    // NEW: host + onBehalfOf (same behavior as Visitor)
    host: ssoHostName,
    onBehalfOf: false,

    countryCode: "+91",
    phone: "",

    purposeOfVisit: "",
    meetingRoom: "",
    meetingRoomRequired: false,
    laptopSerial: "",
    guestWifiRequired: false,
    refreshmentRequired: false,
    proposedRefreshmentTime: "",
    TentativeinTime: "",
    TentativeoutTime: "",

    submittedBy: ssoEmail,
    status: "new",
  };

  const [guests, setGuests] = useState([emptyGuest]);
  const [openIndex, setOpenIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autofillStates, setAutofillStates] = useState({});

  //  When account changes: update submittedBy + (only reset host if NOT onBehalfOf)
  useEffect(() => {
    setGuests((prev) =>
      prev.map((g) => ({
        ...g,
        submittedBy: ssoEmail,
        host: g.onBehalfOf ? g.host : ssoHostName,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ssoEmail, ssoHostName]);

  //  Load edit guest + parse phone
  useEffect(() => {
    if (!guestToEdit) return;

    const rawPhone = guestToEdit.phone || "";
    const match = rawPhone.match(/^(\+\d{1,4})(\d{7,15})$/);

    const parsedCountryCode = guestToEdit.countryCode || match?.[1] || "+91";
    const parsedPhone = match?.[2] || rawPhone;

    setGuests([
      {
        category: guestToEdit.category || "Isuzu Employee",
        firstName: guestToEdit.firstName || "",
        lastName: guestToEdit.lastName || "",
        email: guestToEdit.email || "",
        company: guestToEdit.company || "",

        host: guestToEdit.host || ssoHostName,
        onBehalfOf: guestToEdit.onBehalfOf || false,

        countryCode: parsedCountryCode,
        phone: parsedPhone,

        purposeOfVisit: guestToEdit.purposeOfVisit || "",
        meetingRoom: guestToEdit.meetingRoom || "",
        meetingRoomRequired: guestToEdit.meetingRoomRequired || false,
        laptopSerial: guestToEdit.laptopSerial || "",
        guestWifiRequired: guestToEdit.guestWifiRequired || false,
        refreshmentRequired: guestToEdit.refreshmentRequired || false,
        proposedRefreshmentTime: guestToEdit.proposedRefreshmentTime
          ? new Date(guestToEdit.proposedRefreshmentTime).toISOString().slice(0, 16)
          : "",
        TentativeinTime: guestToEdit.inTime
          ? new Date(guestToEdit.inTime).toISOString().slice(0, 16)
          : "",
        TentativeoutTime: guestToEdit.outTime
          ? new Date(guestToEdit.outTime).toISOString().slice(0, 16)
          : "",

        submittedBy: ssoEmail,
        status: guestToEdit.status || "new",
      },
    ]);

    setOpenIndex(0);
  }, [guestToEdit, ssoEmail, ssoHostName]);

  const getAutofillStateKeyForField = (field) => {
    switch (field) {
      case "host":
        return "host";
      case "category":
        return "category";
      case "company":
        return "company";
      case "purposeOfVisit":
        return "purpose";
      case "TentativeinTime":
      case "TentativeoutTime":
        return "times";
      default:
        return null;
    }
  };

  const handleChange = (index, field, value) => {
    setGuests((prev) => {
      const updated = prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );

      if (index !== 0 || guestToEdit) return updated;

      const autofillStateKey = getAutofillStateKeyForField(field);
      if (!autofillStateKey) return updated;

      return updated.map((item, i) => {
        if (i === 0) return item;
        return { ...item, [field]: value };
      });
    });
  };

  const toggleAutofillForFields = (index, key, fields) => {
    const stateKey = `${index}-${key}`;
    const shouldClear = !!autofillStates[stateKey];

    setGuests((prev) => {
      const firstEntry = prev[0] || {};
      return prev.map((item, i) => {
        if (i !== index) return item;
        const updatedItem = { ...item };
        fields.forEach((field) => {
          updatedItem[field] = shouldClear ? "" : firstEntry[field] || "";
        });
        return updatedItem;
      });
    });

    setAutofillStates((prev) => ({
      ...prev,
      [stateKey]: !prev[stateKey],
    }));
  };

  const renderAutofillButton = (index, key, fields) => {
    if (guestToEdit || guests.length <= 1 || index === 0) return null;
    const stateKey = `${index}-${key}`;
    const isClearMode = !!autofillStates[stateKey];

    return (
      <button
        type="button"
        className={`btn visitor-autofill-btn ${isClearMode ? "btn-danger" : "btn-success"}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleAutofillForFields(index, key, fields);
        }}
      >
        <img src={duplicateIcon} alt="copy or clear" style={{ width: "20px", height: "20px" }} />
      </button>
    );
  };

  const addGuest = () => {
    setGuests((prev) => [...prev, { ...emptyGuest, submittedBy: ssoEmail, host: ssoHostName }]);
    setOpenIndex(guests.length);
  };

  const removeGuest = (index) => {
    setGuests((prev) => prev.filter((_, i) => i !== index));
    setOpenIndex(index === 0 ? 0 : index - 1);
    setAutofillStates((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        if (!k.startsWith(`${index}-`)) next[k] = prev[k];
      });
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    for (const g of guests) {
      const phoneCheck = validatePhoneLength(g.countryCode, g.phone);
      if (!phoneCheck.valid) {
        setLoading(false);
        Swal.fire({ icon: "error", title: "Invalid phone", text: phoneCheck.message });
        return;
      }
    }

    try {
      const payload = guests.map((g) => ({
        category: g.category,
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
        company: g.company,

        //  send host + onBehalfOf
        host: g.host,
        onBehalfOf: g.onBehalfOf,

        countryCode: g.countryCode,
        phone: `${g.countryCode}${g.phone}`,

        purposeOfVisit: g.purposeOfVisit,
        meetingRoom: g.meetingRoom,
        meetingRoomRequired: g.meetingRoomRequired,
        laptopSerial: g.laptopSerial,
        guestWifiRequired: g.guestWifiRequired,
        refreshmentRequired: g.refreshmentRequired,
        proposedRefreshmentTime: g.proposedRefreshmentTime
          ? new Date(g.proposedRefreshmentTime)
          : null,
        inTime: g.TentativeinTime ? new Date(g.TentativeinTime) : null,
        outTime: g.TentativeoutTime ? new Date(g.TentativeoutTime) : null,

        submittedBy: ssoEmail,
        status: g.status || "new",
      }));

      if (guestToEdit) {
        await axios.put(
          `${process.env.REACT_APP_API_URL}/api/guests/${guestToEdit._id}`,
          payload[0]
        );

        Swal.fire({
          icon: "success",
          title: "Guest Updated!",
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/guests`, payload);

        Swal.fire({
          icon: "success",
          title: "Submission Successful!",
          showConfirmButton: false,
          timer: 2000,
        });
      }

      setGuests([{ ...emptyGuest, submittedBy: ssoEmail, host: ssoHostName }]);
      setOpenIndex(0);
      setActiveForm(null);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: err.response?.data?.error || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="p-4 shadow-lg rounded-4 position-relative"
      style={{
        flex: isMobile ? "1 1 100%" : "0 0 500px",
        marginTop: isMobile ? "15px" : "0",
        background: "#F2F2F2",
      }}
      initial={{ x: isMobile ? 0 : 200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: isMobile ? 0 : 200, opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="fw-bold text-center mb-4">
        {guestToEdit ? "Edit Guest" : "Guest Details"}
      </h3>

      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {guests.map((guest, index) => (
          <motion.div
            key={index}
            className="p-3 rounded-4 shadow-sm border"
            style={{
              background: "linear-gradient(90deg, #F2F2F2, #CECECE)",
              cursor: "pointer",
            }}
            whileHover={{ scale: 1.02 }}
          >
            <div
              className="d-flex justify-content-between align-items-center mb-3"
            >
              <h5
                className="fw-bold mb-0 d-flex align-items-center"
                style={{ cursor: "pointer" }}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <FaUser className="me-2 text-primary" /> Guest {index + 1}
              </h5>

              {!guestToEdit && index > 0 && openIndex !== index && (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeGuest(index);
                  }}
                >
                  Delete Entry
                </button>
              )}
            </div>

            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="d-flex flex-column gap-2"
                >
                  {/* ✅ Host + On behalf of */}
                  <label className="fw-bold">Host</label>
                  <div className="d-flex gap-2 align-items-start">
                    <input
                      className="form-control flex-grow-1"
                      placeholder="Host"
                      required
                      value={guest.host}
                      onChange={(e) => handleChange(index, "host", e.target.value)}
                      disabled={!guest.onBehalfOf}
                    />

                    <button
                      type="button"
                      className="btn btn-outline-primary visitor-inline-btn"
                      onClick={() =>
                        handleChange(index, "onBehalfOf", !guest.onBehalfOf)
                      }
                    >
                      On behalf of
                    </button>
                    {renderAutofillButton(index, "host", ["host"])}
                  </div>

                  <label className="fw-bold">Category</label>
                  <div className="d-flex gap-2 align-items-center">
                    <select
                      className="form-select"
                      value={guest.category}
                      onChange={(e) => handleChange(index, "category", e.target.value)}
                      required
                    >
                      <option value="Isuzu Employee">Isuzu Employee</option>
                      <option value="UD Employee">UD Employee</option>
                    </select>
                    {renderAutofillButton(index, "category", ["category"])}
                  </div>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="First Name"
                    value={guest.firstName}
                    onChange={(e) => handleChange(index, "firstName", e.target.value)}
                    required
                  />

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Last Name"
                    value={guest.lastName}
                    onChange={(e) => handleChange(index, "lastName", e.target.value)}
                  />

                  <input
                    type="email"
                    className="form-control"
                    placeholder="Email"
                    value={guest.email}
                    onChange={(e) => handleChange(index, "email", e.target.value)}
                  />

                  <div className="d-flex gap-2 align-items-center">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Company / Address"
                      value={guest.company}
                      onChange={(e) => handleChange(index, "company", e.target.value)}
                      required
                    />
                    {renderAutofillButton(index, "company", ["company"])}
                  </div>

                  {/* Country Code + Phone */}
                  <div className="d-flex gap-2">
                    <select
                      className="form-select"
                      style={{ maxWidth: "160px" }}
                      value={guest.countryCode || "+91"}
                      onChange={(e) => handleChange(index, "countryCode", e.target.value)}
                      required
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      className="form-control"
                      placeholder="Phone Number"
                      value={guest.phone}
                      onChange={(e) => handleChange(index, "phone", e.target.value)}
                      required
                    />
                  </div>

                  <div className="d-flex gap-2 align-items-center">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Purpose of Visit"
                      value={guest.purposeOfVisit}
                      onChange={(e) => handleChange(index, "purposeOfVisit", e.target.value)}
                      required
                    />
                    {renderAutofillButton(index, "purpose", ["purposeOfVisit"])}
                  </div>

                  {/* Meeting Room Required Toggle */}
                  <div className="d-flex align-items-center mt-3">
                    <strong className="me-2">Meeting Room Booked:</strong>
                    <div
                      className={`wifi-toggle ${guest.meetingRoomRequired ? "active" : ""}`}
                      onClick={() =>
                        handleChange(index, "meetingRoomRequired", !guest.meetingRoomRequired)
                      }
                    >
                      <div className="toggle-circle"></div>
                    </div>
                  </div>

                  {guest.meetingRoomRequired && (
                    <input
                      type="text"
                      className="form-control mt-2"
                      placeholder="Meeting Room"
                      value={guest.meetingRoom}
                      onChange={(e) => handleChange(index, "meetingRoom", e.target.value)}
                      required
                    />
                  )}

                  {/* Guest WiFi Toggle */}
                  <div className="d-flex align-items-center mt-3">
                    <FaWifi
                      className={`me-2 fs-5 ${
                        guest.guestWifiRequired ? "text-success" : "text-secondary"
                      }`}
                    />
                    <strong className="me-2">Guest Wi-Fi:</strong>
                    <div
                      className={`wifi-toggle ${guest.guestWifiRequired ? "active" : ""}`}
                      onClick={() =>
                        handleChange(index, "guestWifiRequired", !guest.guestWifiRequired)
                      }
                    >
                      <div className="toggle-circle"></div>
                    </div>
                  </div>

                  {/* Refreshment Toggle */}
                  <div className="d-flex align-items-center mt-3">
                    <strong className="me-2">Refreshment Required:</strong>
                    <div
                      className={`wifi-toggle ${guest.refreshmentRequired ? "active" : ""}`}
                      onClick={() =>
                        handleChange(index, "refreshmentRequired", !guest.refreshmentRequired)
                      }
                    >
                      <div className="toggle-circle"></div>
                    </div>
                  </div>

                  {guest.refreshmentRequired && (
                    <>
                      <label className="fw-bold mt-3">Proposed Refreshment Time</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={guest.proposedRefreshmentTime || ""}
                        onChange={(e) =>
                          handleChange(index, "proposedRefreshmentTime", e.target.value)
                        }
                        required
                      />
                    </>
                  )}

                  <label className="fw-bold mt-3">Tentative In & Out Time</label>
                  <div className="d-flex gap-2 align-items-center">
                    <div className="d-flex gap-2 w-100">
                      <input
                        type="datetime-local"
                        className="form-control"
                        required
                        value={guest.TentativeinTime}
                        onChange={(e) => handleChange(index, "TentativeinTime", e.target.value)}
                      />
                      <input
                        type="datetime-local"
                        className="form-control"
                        required
                        value={guest.TentativeoutTime}
                        onChange={(e) => handleChange(index, "TentativeoutTime", e.target.value)}
                      />
                    </div>
                    {renderAutofillButton(index, "times", ["TentativeinTime", "TentativeoutTime"])}
                  </div>

                  {!guestToEdit && index > 0 && (
                    <button
                      type="button"
                      className="btn btn-outline-danger w-100 mt-2"
                      onClick={() => removeGuest(index)}
                    >
                      Delete Entry
                    </button>
                  )}

                  <p className="text-muted mt-2 mb-0">
                    <small>Submitted by: {guest.submittedBy}</small>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {!guestToEdit && (
          <motion.button
            type="button"
            className="bg-dark text-white mt-2 py-2 rounded-3 border-0"
            onClick={addGuest}
            whileHover={{ scale: 1.05 }}
          >
            + Add Another Guest
          </motion.button>
        )}

        <div className="d-flex justify-content-between mt-3">
          <motion.button
            type="button"
            className="btn btn-outline-danger px-4 py-2 rounded-3"
            onClick={() => setActiveForm(null)}
            whileHover={{ scale: 1.05 }}
          >
            Cancel
          </motion.button>

          <motion.button
            type="submit"
            className="btn btn-success px-4 py-2 rounded-3"
            whileHover={{ scale: 1.05 }}
            disabled={loading}
          >
            {loading ? "Submitting..." : guestToEdit ? "Save Changes" : "Submit"}
          </motion.button>
        </div>
      </form>

      <style>{`
        .visitor-autofill-btn {
          width: 38px;
          height: 38px;
          min-width: 38px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .visitor-inline-btn {
          height: 38px;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .wifi-toggle {
          width: 50px;
          height: 26px;
          background: #ccc;
          border-radius: 50px;
          display: flex;
          align-items: center;
          padding: 3px;
          transition: background 0.3s ease;
          cursor: pointer;
        }
        .wifi-toggle.active { background: rgb(7, 143, 167); }
        .toggle-circle {
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }
        .wifi-toggle.active .toggle-circle { transform: translateX(24px); }
      `}</style>
    </motion.div>
  );
}
