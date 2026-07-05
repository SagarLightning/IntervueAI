import React, { useState } from "react"
import "../auth.form.scss";
import {Navigate, Link } from "react-router";
import {useAuth} from "../hooks/useAuth";
import {useNavigate} from "react-router"

const Login = () => {

  const {loading, handleLogin}=useAuth();
  const navigate = useNavigate();
  const [email, setEmail]=useState("")
  const [password, setPassord]=useState("");

  const handleSubmit= async (e)=>{
    e.preventDefault()
    try {
        await handleLogin({email,password})
        navigate("/home")
    } catch (err) {
        alert(err.response?.data?.message || "Login failed. Please check your credentials.");
    }
  }
  if(loading){
    return (<main><h1>Loading...Please wait</h1></main>)
  }

  return (
    <main>
      <div className="form-container">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>


          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input onChange={(e)=>setEmail(e.target.value)}
            type="email" id='email' name='email' placeholder="Enter Email address" />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input onChange={(e)=>setPassord(e.target.value)}
             type="password" id='password' name='password' placeholder="Enter Password" />
          </div>
          
          <button className="button primary-button">Login</button>
        </form>

        <p>Don't have an account? <Link to="/register">Register</Link></p>
      </div>
    </main>
  )
}

export default Login
