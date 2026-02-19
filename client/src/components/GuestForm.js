import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUser, FaWifi } from "react-icons/fa";
import { useMsal } from "@azure/msal-react";
import axios from "axios";
import Swal from "sweetalert2";
import { validatePhoneLength } from "../utils/phoneUtils";

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
  const [autofillEnabled, setAutofillEnabled] = useState({});

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
          ? (() => {
              const dt = new Date(guestToEdit.proposedRefreshmentTime);
              return dt.toISOString().slice(0, 16);
            })()
          : "",
        TentativeinTime: guestToEdit.inTime
          ? (() => {
              const dt = new Date(guestToEdit.inTime);
              return dt.toISOString().slice(0, 16);
            })()
          : "",
        TentativeoutTime: guestToEdit.outTime
          ? (() => {
              const dt = new Date(guestToEdit.outTime);
              return dt.toISOString().slice(0, 16);
            })()
          : "",

        submittedBy: ssoEmail,
        status: guestToEdit.status || "new",
      },
    ]);

    setOpenIndex(0);
  }, [guestToEdit, ssoEmail, ssoHostName]);

  const handleChange = (index, field, value) => {
    setGuests((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addGuest = () => {
    setGuests((prev) => [...prev, { ...emptyGuest, submittedBy: ssoEmail, host: ssoHostName }]);
    setOpenIndex(guests.length);
  };

  const removeGuest = (index) => {
    setGuests((prev) => prev.filter((_, i) => i !== index));
    setOpenIndex(index === 0 ? 0 : index - 1);
  };

  const autofillFromFirst = (index) => {
    if (index === 0) return; // Can't autofill the first guest from itself
    
    const firstGuest = guests[0];
    const updated = [...guests];
    updated[index] = {
      ...updated[index],
      host: firstGuest.host,
      category: firstGuest.category,
      company: firstGuest.company,
      purposeOfVisit: firstGuest.purposeOfVisit,
      guestWifiRequired: firstGuest.guestWifiRequired,
      proposedRefreshmentTime: firstGuest.proposedRefreshmentTime,
      TentativeinTime: firstGuest.TentativeinTime,
      TentativeoutTime: firstGuest.TentativeoutTime,
    };
    setGuests(updated);
    setAutofillEnabled({ ...autofillEnabled, [index]: true });
  };

  const clearAutofill = (index) => {
    if (index === 0) return;
    
    const updated = [...guests];
    updated[index] = {
      ...updated[index],
      host: ssoHostName,
      category: "Isuzu Employee",
      company: "",
      purposeOfVisit: "",
      guestWifiRequired: false,
      proposedRefreshmentTime: "",
      TentativeinTime: "",
      TentativeoutTime: "",
    };
    setGuests(updated);
    setAutofillEnabled({ ...autofillEnabled, [index]: false });
  };

  //  Host toggle exactly like visitor:
  // ON  -> clear host, enable typing
  // OFF -> reset host to logged-in user, disable typing
  const toggleOnBehalfOf = (index) => {
    const g = guests[index];
    const newValue = !g.onBehalfOf;

    handleChange(index, "onBehalfOf", newValue);

    if (newValue) {
      // turning ON -> clear so user can type
      handleChange(index, "host", "");
    } else {
      // turning OFF -> reset to logged in
      handleChange(index, "host", ssoHostName);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Basic validation: phone length per country
    for (const g of guests) {
      const phoneCheck = validatePhoneLength(g.countryCode, g.phone);
      if (!phoneCheck.valid) {
        setLoading(false);
        Swal.fire({ icon: "error", title: "Invalid phone", text: phoneCheck.message });
        return;
      }
    }

    try {
      const payload = guests.map((g) => {
        // Parse "YYYY-MM-DD HH:MM" format back to ISO datetime
        const parseDateTime = (dateTimeStr) => {
          if (!dateTimeStr) return null;
          return new Date(dateTimeStr.replace(" ", "T"));
        };

        return {
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
          proposedRefreshmentTime: parseDateTime(g.proposedRefreshmentTime),
          inTime: parseDateTime(g.TentativeinTime),
          outTime: parseDateTime(g.TentativeoutTime),

          submittedBy: ssoEmail,
          status: g.status || "new",
        };
      });

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
                className="fw-bold mb-0 d-flex align-items-center flex-grow-1"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                style={{ cursor: "pointer" }}
              >
                <FaUser className="me-2 text-primary" /> Guest {index + 1}
              </h5>
              {!guestToEdit && guests.length > 1 && openIndex !== index && index > 0 && (
                <button
                  className="btn btn-danger btn-sm"
                  type="button"
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
                  <div className="d-flex gap-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Host"
                      value={guest.host}
                      disabled={!guest.onBehalfOf}
                      onChange={(e) => handleChange(index, "host", e.target.value)}
                      required
                    />

                    <button
                      type="button"
                      className={`btn ${
                        guest.onBehalfOf ? "btn-dark" : "btn-outline-dark"
                      }`}
                      onClick={() => toggleOnBehalfOf(index)}
                    >
                      On behalf of
                    </button>
                  </div>

                  <label className="fw-bold">Category</label>
                  <select
                    className="form-select"
                    value={guest.category}
                    onChange={(e) => handleChange(index, "category", e.target.value)}
                    required
                  >
                    <option value="Isuzu Employee">Isuzu Employee</option>
                    <option value="UD Employee">UD Employee</option>
                  </select>

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

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Company / Address"
                    value={guest.company}
                    onChange={(e) => handleChange(index, "company", e.target.value)}
                    required
                  />

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

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Purpose of Visit"
                    value={guest.purposeOfVisit}
                    onChange={(e) => handleChange(index, "purposeOfVisit", e.target.value)}
                    required
                  />

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

                  <label className="fw-bold mt-3">Tentative In Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={guest.TentativeinTime || ""}
                    onChange={(e) => handleChange(index, "TentativeinTime", e.target.value)}
                    required
                  />

                  <label className="fw-bold mt-3">Tentative Out Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={guest.TentativeoutTime || ""}
                    onChange={(e) => handleChange(index, "TentativeoutTime", e.target.value)}
                    required
                  />

                  {!guestToEdit && guests.length > 1 && (
                    <div className="d-flex gap-2 mt-3">
                      {index > 0 && (
                        <button
                          className={`btn btn-sm flex-grow-1 ${
                            autofillEnabled[index]
                              ? "btn-danger"
                              : "btn-success"
                          }`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (autofillEnabled[index]) {
                              clearAutofill(index);
                            } else {
                              autofillFromFirst(index);
                            }
                          }}
                        >
                          {autofillEnabled[index]
                            ? "Clear Autofill"
                            : "Copy from first guest"}
                        </button>
                      )}
                      <button
                        className="btn btn-danger btn-sm flex-grow-1"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGuest(index);
                        }}
                      >
                        Delete Entry
                      </button>
                    </div>
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
