import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    ...StyleSheet.absoluteFillObject,
  },
  finder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLeftEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  topRightEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  bottomLeftEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  bottomRightEdge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  maskOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  maskInner: {
    backgroundColor: 'transparent',
  },
  maskRow: {
    width: '100%',
  },
  maskCenter: {
    display: 'flex',
    flexDirection: 'row',
  },
  animatedLine: {
    position: 'absolute',
    elevation: 4,
    zIndex: 0,
    width: '85%',
  },
});

class BarcodeMask extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      top: new Animated.Value(10),
      maskCenterViewHeight: 0,
    };
  }

  _onMaskCenterViewLayoutUpdated = ({ nativeEvent }) => {
    this.setState({
      maskCenterViewHeight: nativeEvent.layout.height,
    });
  };

  _applyMaskFrameStyle = () => {
    let backgroundColor = '';
    if (
      this.props.backgroundColor &&
      String(this.props.backgroundColor)
    ) {
      backgroundColor = this.props.backgroundColor;
    }

    return { backgroundColor: this.props.darken ?? true ? "rgba(0, 0, 0, 0.6)" : "transparent", flex: 1 };
  };

  _renderEdge = (edgePosition) => {
    const defaultStyle = {
      width: this.props.edgeWidth,
      height: this.props.edgeHeight,
      borderColor: this.props.edgeColor,
    };
    const edgeBorderStyle = {
      topRight: {
        borderRightWidth: this.props.edgeBorderWidth,
        borderTopWidth: this.props.edgeBorderWidth,
      },
      topLeft: {
        borderLeftWidth: this.props.edgeBorderWidth,
        borderTopWidth: this.props.edgeBorderWidth,
      },
      bottomRight: {
        borderRightWidth: this.props.edgeBorderWidth,
        borderBottomWidth: this.props.edgeBorderWidth,
      },
      bottomLeft: {
        borderLeftWidth: this.props.edgeBorderWidth,
        borderBottomWidth: this.props.edgeBorderWidth,
      },
    };
    return <View style={[defaultStyle, styles[edgePosition + 'Edge'], edgeBorderStyle[edgePosition]]} />;
  };

  render() {
    return (
      <View style={[styles.container]}>
        <View
          style={[
            styles.finder,
            {
              width: this.props.width,
              height: this.props.height,
            },
          ]}
        >
          {this._renderEdge('topLeft')}
          {this._renderEdge('topRight')}
          {this._renderEdge('bottomLeft')}
          {this._renderEdge('bottomRight')}
        </View>

        <View style={styles.maskOuter}>
          <View style={[styles.maskRow, this._applyMaskFrameStyle()]} />
          <View
            style={[{ height: this.props.height }, styles.maskCenter]}
            onLayout={this._onMaskCenterViewLayoutUpdated}
          >
            <View style={[this._applyMaskFrameStyle()]} />
            <View
              style={[
                styles.maskInner,
                {
                  width: this.props.width,
                  height: this.props.height,
                },
              ]}
            />
            <View style={[this._applyMaskFrameStyle()]} />
          </View>
          <View style={[styles.maskRow, this._applyMaskFrameStyle()]} />
        </View>
      </View>
    );
  }

}

const propTypes: PropsType = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  edgeWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  edgeHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  edgeColor: PropTypes.string,
  edgeBorderWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  showAnimatedLine: PropTypes.bool,
  animatedLineColor: PropTypes.string,
  animatedLineHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lineAnimationDuration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  backgroundColor: PropTypes.string,
};

const defaultProps = {
  width: 280,
  height: 230,
  edgeWidth: 20,
  edgeHeight: 20,
  edgeColor: '#FFF',
  edgeBorderWidth: 4,
  showAnimatedLine: true,
  animatedLineColor: '#FFF',
  animatedLineHeight: 2,
  lineAnimationDuration: 1500,
  backgroundColor: 'rgba(0, 0, 0, 0.6)'
};

BarcodeMask.propTypes = propTypes;
BarcodeMask.defaultProps = defaultProps;

export default BarcodeMask;
