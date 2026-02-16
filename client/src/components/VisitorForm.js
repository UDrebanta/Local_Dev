import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUser, FaWifi } from "react-icons/fa";
import axios from "axios";
import Swal from "sweetalert2";
import { validatePhoneLength } from "../utils/phoneUtils";

export default function VisitorForm({ isMobile, setActiveForm, visitorToEdit }) {
  

  // Get SSO user info - with better fallback
  // Temporary logged-in user (replace later with real auth)
  const ssoUserName = localStorage.getItem("username") || "Employee User";
  const ssoEmail = localStorage.getItem("email") || "employee@company.com";


  // Country code list (extend as needed)
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

  const emptyVisitor = {
    category: "Visitor",
    host: ssoUserName, //  default host = logged-in user
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    countryCode: "+91", // default
    phone: "",
    purposeOfVisit: "",
    meetingRoom: "",
    laptopSerial: "",
    guestWifiRequired: false,
    TentativeinTime: "",
    TentativeoutTime: "",
    submittedBy: ssoUserName,
    status: "new",
  };

  const [visitors, setVisitors] = useState([emptyVisitor]);
  const [openIndex, setOpenIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Update submittedBy + host when account changes
  

  // Load edit visitor
  useEffect(() => {
    if (visitorToEdit) {
      const rawPhone = visitorToEdit.phone || "";
      const match = rawPhone.match(/^(\+\d{1,4})(\d{7,15})$/);

      const parsedCountryCode = visitorToEdit.countryCode || match?.[1] || "+91";
      const parsedPhone = match?.[2] || rawPhone; // fallback if not matching

      // Parse inTime
      const inDateTime = visitorToEdit.inTime ? new Date(visitorToEdit.inTime) : null;
      const inDateTimeString = inDateTime
      ? inDateTime.toISOString().slice(0, 16)
      : "";

    // Parse outTime
    const outDateTime = visitorToEdit.outTime ? new Date(visitorToEdit.outTime) : null;
    const outDateTimeString = outDateTime
      ? outDateTime.toISOString().slice(0, 16)
      : "";

    setVisitors([{
          category: visitorToEdit.category || "Visitor",
          host: visitorToEdit.host || ssoUserName, //  keep existing host, else logged-in
          countryCode: parsedCountryCode,
          phone: parsedPhone,
          TentativeinTime: inDateTimeString,
          TentativeoutTime: outDateTimeString,
          submittedBy: ssoUserName,
        },
      ]);
      setOpenIndex(0);
    }
  }, [visitorToEdit, ssoUserName]);

  const handleChange = (index, field, value) => {
    const updated = [...visitors];
    updated[index][field] = value;
    setVisitors(updated);
  };

  const addVisitor = () => {
    setVisitors([...visitors, { ...emptyVisitor, submittedBy: ssoUserName, host: ssoUserName }]);
    setOpenIndex(visitors.length);
  };

  const removeVisitor = (index) => {
    const updated = visitors.filter((_, i) => i !== index);
    setVisitors(updated);
    setOpenIndex(0);
  };

  const autofillFromFirst = (index) => {
    if (index === 0) return; // Can't autofill the first visitor from itself
    
    const firstVisitor = visitors[0];
    const updated = [...visitors];
    updated[index] = {
      ...updated[index],
      company: firstVisitor.company,
      purposeOfVisit: firstVisitor.purposeOfVisit,
      TentativeinTime: firstVisitor.TentativeinTime,
      TentativeoutTime: firstVisitor.TentativeoutTime,
    };
    setVisitors(updated);
  };

  const validate = () => {
    let temp = {};

    visitors.forEach((v) => {
      const phoneCheck = validatePhoneLength(v.countryCode, v.phone);
      if (!phoneCheck.valid) {
        temp.phone = phoneCheck.message;
      }
      if (!v.countryCode || v.countryCode.trim() === "") {
        temp.countryCode = "Country code is required";
      }
      if (!v.host || v.host.trim() === "") {
        temp.host = "Host is required";
      }
    });

    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      Swal.fire({
        icon: "error",
        title: "Missing Required Fields",
        text: "Please fill phone number, country code and host.",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = visitors.map((v) => {
        // Parse "YYYY-MM-DD HH:MM" format back to ISO datetime
        const parseDateTime = (dateTimeStr) => {
          if (!dateTimeStr) return null;
          return new Date(dateTimeStr.replace(" ", "T"));
        };

        return {
          ...v,
          phone: `${v.countryCode}${v.phone}`,
          inTime: parseDateTime(v.TentativeinTime),
          outTime: parseDateTime(v.TentativeoutTime),
          submittedBy: ssoEmail,
        };
      });

      if (visitorToEdit) {
        await axios.put(
          `${process.env.REACT_APP_API_URL}/api/visitors/${visitorToEdit._id}`,
          payload[0]
        );

        Swal.fire({
          icon: "success",
          title: "Visitor Updated!",
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        const apiUrl = process.env.REACT_APP_API_URL;

        const response = await axios.post(`${apiUrl}/api/visitors`, payload);
        console.log(response)

        Swal.fire({
          icon: "success",
          title: "Visitors Submitted!",
          showConfirmButton: false,
          timer: 2000,
        });
      }

      setVisitors([{ ...emptyVisitor, submittedBy: ssoEmail, host: ssoUserName }]);
      setOpenIndex(0);
      setActiveForm(null);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.error || err.message,
      });
    }

    setLoading(false);
  };

  return (
    <motion.div
      className="p-4 shadow-lg rounded-4 position-relative"
      style={{
        flex: isMobile ? "1 1 100%" : "0 0 500px",
        marginTop: isMobile ? "15px" : "0",
        background: "#F2F2F2",
      }}
      initial={{ x: 200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 200, opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="fw-bold text-center mb-4">
        {visitorToEdit ? "Edit Visitor" : "Visitor Details"}
      </h3>

      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {visitors.map((visitor, index) => (
          <motion.div
            key={index}
            className="p-3 rounded-4 shadow-sm border"
            style={{
              background: "linear-gradient(90deg, #F2F2F2, #CECECE)",
            }}
            whileHover={{ scale: 1.02 }}
          >
            <div
              className="d-flex justify-content-between align-items-center mb-3"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <h5 className="fw-bold mb-0 d-flex align-items-center">
                <FaUser className="me-2 text-primary" /> Visitor {index + 1}
              </h5>

              {!visitorToEdit && visitors.length > 1 && (
                <div className="d-flex gap-2">
                  {index > 0 && (
                    <button
                      className="btn btn-outline-success btn-sm"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        autofillFromFirst(index);
                      }}
                    >
                      Autofill
                    </button>
                  )}
                  <button
                    className="btn btn-outline-danger btn-sm"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeVisitor(index);
                    }}
                  >
                    Remove
                  </button>
                </div>
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
                  {/*  Host field + On behalf button */}
                  <label className="fw-bold">Host</label>
                  <div className="d-flex gap-2">
                    <input
                      className="form-control"
                      placeholder="Host"
                      required
                      value={visitor.host}
                      onChange={(e) => handleChange(index, "host", e.target.value)}
                      disabled={!visitor.onBehalfOf} // disabled by default
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() =>
                        handleChange(index, "onBehalfOf", !visitor.onBehalfOf)
                      }
                    >
                      On behalf of
                    </button>
                  </div>

                  {errors.host && (
                    <p style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>
                      {errors.host}
                    </p>
                  )}

                  <input
                    className="form-control"
                    placeholder="First Name"
                    required
                    value={visitor.firstName}
                    onChange={(e) =>
                      handleChange(index, "firstName", e.target.value)
                    }
                  />

                  <input
                    className="form-control"
                    placeholder="Last Name"
                    required
                    value={visitor.lastName}
                    onChange={(e) =>
                      handleChange(index, "lastName", e.target.value)
                    }
                  />

                  <input
                    className="form-control"
                    placeholder="Email"
                    required
                    type="email"
                    value={visitor.email}
                    onChange={(e) =>
                      handleChange(index, "email", e.target.value)
                    }
                  />

                  <input
                    className="form-control"
                    placeholder="Company"
                    required
                    value={visitor.company}
                    onChange={(e) =>
                      handleChange(index, "company", e.target.value)
                    }
                  />

                  {/*  Country Code + Phone */}
                  <div className="d-flex gap-2">
                    <select
                      className="form-select"
                      style={{ maxWidth: "160px" }}
                      value={visitor.countryCode || "+91"}
                      onChange={(e) =>
                        handleChange(index, "countryCode", e.target.value)
                      }
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>

                    <input
                      className="form-control"
                      placeholder="Phone Number"
                      type="tel"
                      required
                      value={visitor.phone}
                      onChange={(e) =>
                        handleChange(index, "phone", e.target.value)
                      }
                    />
                  </div>

                  {(errors.countryCode || errors.phone) && (
                    <p style={{ color: "red", fontSize: "12px", marginTop: "5px" }}>
                      {errors.countryCode || errors.phone}
                    </p>
                  )}

                  <input
                    className="form-control"
                    placeholder="Purpose of Visit"
                    required
                    value={visitor.purposeOfVisit}
                    onChange={(e) =>
                      handleChange(index, "purposeOfVisit", e.target.value)
                    }
                  />

                  <input
                    className="form-control"
                    placeholder="Meeting Room (optional)"
                    value={visitor.meetingRoom}
                    onChange={(e) =>
                      handleChange(index, "meetingRoom", e.target.value)
                    }
                  />

                  <input
                    className="form-control"
                    placeholder="Laptop Serial (optional)"
                    value={visitor.laptopSerial}
                    onChange={(e) =>
                      handleChange(index, "laptopSerial", e.target.value)
                    }
                  />

                  <div className="d-flex align-items-center mt-3">
                    <FaWifi
                      className={`me-2 fs-5 ${
                        visitor.guestWifiRequired
                          ? "text-success"
                          : "text-secondary"
                      }`}
                    />
                    <strong className="me-2">Guest Wi-Fi:</strong>

                    <div
                      className={`wifi-toggle ${
                        visitor.guestWifiRequired ? "active" : ""
                      }`}
                      onClick={() =>
                        handleChange(
                          index,
                          "guestWifiRequired",
                          !visitor.guestWifiRequired
                        )
                      }
                    >
                      <div className="toggle-circle"></div>
                    </div>
                  </div>

                  <label className="fw-bold mt-3">Tentative In Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={visitor.TentativeinTime}
                    onChange={(e) =>
                      handleChange(index, "TentativeinTime", e.target.value)
                    }
                    required
                  />

                  <label className="fw-bold mt-3">Tentative Out Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={visitor.TentativeoutTime}
                    onChange={(e) =>
                      handleChange(index, "TentativeoutTime", e.target.value)
                    }
                    required
                  />

                  <p className="text-muted mt-2 mb-0">
                    <small>Submitted by: {visitor.submittedBy}</small>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {!visitorToEdit && (
          <motion.button
            type="button"
            className="bg-dark text-white mt-2 py-2 rounded-3 border-0"
            onClick={addVisitor}
            whileHover={{ scale: 1.05 }}
          >
            + Add Another Visitor
          </motion.button>
        )}

        <div className="d-flex justify-content-between mt-3">
          <motion.button
            type="button"
            className="btn btn-outline-danger px-4 py-2"
            onClick={() => setActiveForm(null)}
            whileHover={{ scale: 1.05 }}
          >
            Cancel
          </motion.button>

          <motion.button
            type="submit"
            className="btn btn-success px-4 py-2"
            disabled={loading}
            whileHover={{ scale: 1.05 }}
          >
            {loading ? "Submitting..." : visitorToEdit ? "Save Changes" : "Submit"}
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
          cursor: pointer;
          transition: background 0.3s ease;
        }
        .wifi-toggle.active { background: rgb(7, 143, 167); }
        .toggle-circle {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }
        .wifi-toggle.active .toggle-circle { transform: translateX(24px); }
      `}</style>
    </motion.div>
  );
}
