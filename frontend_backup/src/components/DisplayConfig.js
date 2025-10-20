import React from 'react';
import './DisplayConfig.css';

const numberUnits = [
  { unit: '万', exponent: '10^4' },
  { unit: '亿', exponent: '10^8' },
  { unit: '兆', exponent: '10^12' },
  { unit: '京', exponent: '10^16' },
  { unit: '垓', exponent: '10^20' },
  { unit: '秭', exponent: '10^24' },
  { unit: '穰', exponent: '10^28' },
  { unit: '沟', exponent: '10^32' },
  { unit: '涧', exponent: '10^36' },
  { unit: '正', exponent: '10^40' },
  { unit: '载', exponent: '10^44' },
  { unit: '极', exponent: '10^48' }
];

const DisplayConfig = () => {
  return (
    <div className="display-config">
      <table className="table">
        <thead>
          <tr>
            <th>单位</th>
            <th>指数</th>
          </tr>
        </thead>
        <tbody>
          {numberUnits.map((item, index) => (
            <tr key={index}>
              <td>{item.unit}</td>
              <td>{item.exponent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DisplayConfig;
