import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const RegistrationForm = () => {
  const location = useLocation();
  const subEvent = location.state?.subEvent;
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [fees, setFees] = useState("");
  const [teamLeaderGender, setTeamLeaderGender] = useState('');
  const [teamLeader, setTeamLeader] = useState({
    name: '',
    mobile: '',
    email: '',
    college: ''
  });

  useEffect(() => {
    axios.get('http://localhost:6005/user', { withCredentials: true })
      .then(response => {
        const email = response.data.user.email;
        setUserEmail(email);
        setTeamLeader(prevLeader => ({ ...prevLeader, email: email }));
      })
      .catch(error => {
        console.error('Error fetching user email:', error);
        alert('Error fetching user email. Please make sure you are logged in.');
      });
  }, []);

  if (!subEvent) {
    return <p>Error: Registration not available.</p>;
  }

  const calculateFees = (size) => {
    // Ensure subEvent and fees are defined
    if (subEvent?.fees) {
      const { perTeam, perPerson, singleBoy, singleGirl, Couple, Solo, Duet, perHead, groupTeam, lonewolves, twolonewolves, threelonewolves } = subEvent.fees;

      if (perTeam && perPerson) {
        if (size === 1) {
          setFees(perPerson);
        }
        else {
          setFees(perTeam);
        }

      }
      // Handle fees per team
      else if (perTeam) {
        setFees(perTeam);
      }
      // Handle fees per person
      else if (perPerson) {
        setFees(size * perPerson);
      }
      else if (singleBoy && singleGirl && Couple) {

        // Handle couple-based fees
        if (size === 2) {
          setFees(Couple);
        }
        // Handle gender-based fees
        else if (size === 1 && teamLeaderGender === "Male") {
          setFees(singleBoy);
        }
        else if (size === 1 && teamLeaderGender === "Female") {
          setFees(singleGirl);
        }

      }
      else if (singleBoy && singleGirl) {

        if (size === 1 && teamLeaderGender === "Male") {
          setFees(singleBoy);
        }
        else if (size === 1 && teamLeaderGender === "Female") {
          setFees(singleGirl);
        }

      }
      else if (Couple && size === 2) {

        setFees(Couple);
      }
      else if (Solo && Duet && groupTeam) {
        if (size === 1) {
          setFees(Solo);
        }
        else if (size === 2) {
          setFees(Duet);
        }
        else {
          setFees(groupTeam);
        }

      }
      else if (Solo && Duet && perHead) {
        if (size === 1) {
          setFees(Solo);
        }
        else if (size === 2) {
          setFees(Duet);
        }
        else {
          setFees(size * perHead);
        }
      }
      else if (Solo && Duet) {
        if (size === 1) {
          setFees(Solo);
        }
        else if (size === 2) {
          setFees(Duet);
        }

      }
      else if (lonewolves && twolonewolves && threelonewolves) {
        if (size === 1) {
          setFees(lonewolves);
        }
        else if (size === 2) {
          setFees(twolonewolves);
        }
        else if (size === 3) {
          setFees(threelonewolves);
        }

      }
      // Handle no fees scenario
      else {
        setFees("Fees information not available");
      }
    } else {
      setFees("Fees information not available");
    }
  };


  const handleTeamSizeChange = (e) => {
    const size = e.target.value;
    setTeamSize(size);
    calculateFees(size);
  };

  const handleTeamLeaderChange = (e) => {
    const { name, value } = e.target;
    setTeamLeader(prevLeader => ({ ...prevLeader, [name]: value }));
  };

  const handleGenderChange = (e) => {
    setTeamLeaderGender(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const registrationData = {
      eventName: subEvent.title,
      teamLeaderName: teamLeader.name,
      teamLeaderMobileNo: teamLeader.mobile,
      teamLeaderEmail: teamLeader.email,
      teamLeaderCollege: teamLeader.college,
      teamSize,
      teamLeaderGender
    };

    try {
      const response = await axios.post('http://localhost:6005/registerevent', registrationData);
      alert(response.data.message);
      if (response.data.success) {
        navigate('/profile');
      }
    } catch (err) {

      alert(err.response?.data?.error || 'An error occurred');
    }
  };
  const handleClick = () => {
    navigate('/subevent-details', { state: { subEvent } });
  };

  return (
    <div className="bg-white p-6 rounded shadow-md my-24 max-w-5xl ">
      <div className="mt-2 mb-3 ">
        <svg viewBox="0 0 24 24" width="28" height="28"  fill="#001f3f" onClick={handleClick}
      style={{ cursor: 'pointer' }}>
        <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <path d="M15 18l-6-6 6-6" />
        </svg>              </div>
      <h2 className="text-2xl font-bold mb-4">Event Registration</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Info */}
        <div>
          <label className="block text-sm font-medium mb-2">Event</label>
          <p>{subEvent.title}</p>
        </div>

        {/* Team Leader Info */}
        <div>
          <label className="block text-sm font-medium mb-2">Team Leader Name</label>
          <input
            type="text"
            name="name"
            value={teamLeader.name}
            onChange={handleTeamLeaderChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Team Leader Mobile</label>
          <input
            type="text"
            name="mobile"
            value={teamLeader.mobile}
            onChange={handleTeamLeaderChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Team Leader Email</label>
          <input
            type="email"
            name="email"
            value={teamLeader.email}
            readOnly
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">College</label>
          <input
            type="text"
            name="college"
            value={teamLeader.college}
            onChange={handleTeamLeaderChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Team Size</label>
          <input
            type="number"
            value={teamSize}
            min={subEvent.minteamSize}
            max={subEvent.maxteamSize}
            onChange={handleTeamSizeChange}
            className="w-full border border-gray-300 p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Team Leader Gender</label>
          <select
            value={teamLeaderGender}
            onChange={handleGenderChange}
            className="w-full border border-gray-300 p-2 rounded"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">Registration Fees:</label>
          <div className="text-lg font-bold">{fees ? `₹${fees}` : ""}</div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Register
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistrationForm;